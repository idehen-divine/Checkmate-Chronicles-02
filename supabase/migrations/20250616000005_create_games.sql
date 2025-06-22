/*
# Create Games Table
Stores game-level data and outcome.
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    player1_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    player2_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    game_type text NOT NULL, -- Can be: quick-match, tournament, custom, challenge, etc.
    status text DEFAULT 'waiting' CHECK (
        status IN (
            'waiting',
            'active',
            'finished',
            'cancelled'
        )
    ) NOT NULL,
    winner_id uuid REFERENCES users (id) ON DELETE SET NULL,
    result text CHECK (
        result IN (
            'win',
            'loss',
            'draw',
            'timeout',
            'resign',
            'abort'
        )
    ) NULL,
    meta jsonb DEFAULT '{}' NOT NULL, -- Game state (board, clocks, moves, etc.)
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games (player1_id);

CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games (player2_id);

CREATE INDEX IF NOT EXISTS idx_games_game_type ON games (game_type);

CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);

CREATE INDEX IF NOT EXISTS idx_games_winner_id ON games (winner_id);

CREATE INDEX IF NOT EXISTS idx_games_created_at ON games (created_at);

CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games (updated_at);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their games" ON games FOR
SELECT TO authenticated USING (
        auth.uid () = player1_id
        OR auth.uid () = player2_id
    );

CREATE POLICY "Users can create games" ON games FOR
INSERT
    TO authenticated
WITH
    CHECK (
        auth.uid () = player1_id
        OR auth.uid () = player2_id
    );

CREATE POLICY "Players can update their games" ON games FOR
UPDATE TO authenticated USING (
    auth.uid () = player1_id
    OR auth.uid () = player2_id
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update player ratings when game finishes
CREATE OR REPLACE FUNCTION update_player_ratings()
RETURNS TRIGGER AS $$
DECLARE
    player1_elo integer;
    player2_elo integer;
    player1_new_elo integer;
    player2_new_elo integer;
    elo_change integer;
    k_factor integer := 32;
    expected_score_p1 real;
    actual_score_p1 real;
BEGIN
    -- Only process when game status changes to finished
    IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
        -- Get current ELO ratings
        SELECT elo INTO player1_elo FROM users WHERE id = NEW.player1_id;
        SELECT elo INTO player2_elo FROM users WHERE id = NEW.player2_id;
        
        -- Calculate expected score for player1
        expected_score_p1 := 1.0 / (1.0 + power(10.0, (player2_elo - player1_elo) / 400.0));
        
        -- Determine actual score based on result
        IF NEW.winner_id = NEW.player1_id THEN
            actual_score_p1 := 1.0; -- Player1 wins
        ELSIF NEW.winner_id = NEW.player2_id THEN
            actual_score_p1 := 0.0; -- Player1 loses
        ELSE
            actual_score_p1 := 0.5; -- Draw
        END IF;
        
        -- Calculate ELO change for player1
        elo_change := round(k_factor * (actual_score_p1 - expected_score_p1));
        
        -- Calculate new ELO ratings
        player1_new_elo := player1_elo + elo_change;
        player2_new_elo := player2_elo - elo_change;
        
        -- Ensure ELO doesn't go below 100
        player1_new_elo := GREATEST(player1_new_elo, 100);
        player2_new_elo := GREATEST(player2_new_elo, 100);
        
        -- Update player ratings and game stats
        UPDATE users SET 
            elo = player1_new_elo,
            wins = wins + CASE WHEN NEW.winner_id = NEW.player1_id THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.winner_id = NEW.player2_id THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END
        WHERE id = NEW.player1_id;
        
        UPDATE users SET 
            elo = player2_new_elo,
            wins = wins + CASE WHEN NEW.winner_id = NEW.player2_id THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.winner_id = NEW.player1_id THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.winner_id IS NULL THEN 1 ELSE 0 END
        WHERE id = NEW.player2_id;
        
        -- Insert rating history records (if table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rating_history') THEN
            INSERT INTO rating_history (user_id, game_id, old_elo, new_elo, change)
            VALUES 
                (NEW.player1_id, NEW.id, player1_elo, player1_new_elo, elo_change),
                (NEW.player2_id, NEW.id, player2_elo, player2_new_elo, -elo_change);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update ratings when game finishes
CREATE TRIGGER trigger_update_player_ratings
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_player_ratings();

-- Auto-create game start message when game becomes active
CREATE OR REPLACE FUNCTION create_game_start_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create message when game transitions to active
    IF NEW.status = 'active' AND (OLD.status != 'active' OR OLD.status IS NULL) THEN
        INSERT INTO game_messages (game_id, sender_id, message, type)
        VALUES (NEW.id, NULL, 'Game started! Good luck!', 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_game_start_message
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION create_game_start_message();

-- Auto-create game end message when game finishes
CREATE OR REPLACE FUNCTION create_game_end_message()
RETURNS TRIGGER AS $$
DECLARE
    winner_name text;
    end_message text;
BEGIN
    -- Only create message when game transitions to finished
    IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
        
        IF NEW.winner_id IS NOT NULL THEN
            SELECT username INTO winner_name FROM users WHERE id = NEW.winner_id;
            end_message := winner_name || ' wins by ' || COALESCE(NEW.result, 'unknown method') || '!';
        ELSE
            end_message := 'Game ended in a draw!';
        END IF;
        
        INSERT INTO game_messages (game_id, sender_id, message, type)
        VALUES (NEW.id, NULL, end_message, 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_game_end_message
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION create_game_end_message();

-- Auto-create game invitation message when game is created
CREATE OR REPLACE FUNCTION create_game_invitation_message()
RETURNS TRIGGER AS $$
DECLARE
    player1_name text;
    player2_name text;
BEGIN
    -- Only create invitation message when game is first created
    IF OLD IS NULL THEN
        SELECT username INTO player1_name FROM users WHERE id = NEW.player1_id;
        SELECT username INTO player2_name FROM users WHERE id = NEW.player2_id;
        
        INSERT INTO game_messages (game_id, sender_id, message, type)
        VALUES (NEW.id, NULL, player1_name || ' vs ' || player2_name || ' - Game created!', 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_game_invitation_message
    AFTER INSERT ON games
    FOR EACH ROW
    EXECUTE FUNCTION create_game_invitation_message();

-- Auto-create player join lobby events when game is created
CREATE OR REPLACE FUNCTION create_player_join_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Only when game is first created
    IF OLD IS NULL THEN
        -- Both players join the lobby
        INSERT INTO game_lobby_logs (game_id, player_id, event)
        VALUES 
            (NEW.id, NEW.player1_id, 'entered_lobby'),
            (NEW.id, NEW.player2_id, 'entered_lobby');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_player_join_events
    AFTER INSERT ON games
    FOR EACH ROW
    EXECUTE FUNCTION create_player_join_events();

-- Create trigger to track user activity on game operations
CREATE TRIGGER trigger_games_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON games
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Create trigger to track user activity when games are modified
CREATE TRIGGER trigger_track_game_activity
    AFTER INSERT OR UPDATE OR DELETE ON games
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Create trigger to automatically cleanup old data on interactions
CREATE TRIGGER trigger_auto_cleanup_games
    AFTER INSERT ON games
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_old_games();

-- OPTIMIZATION: Add retention policy and cleanup functions
-- 1. Cleanup old games (1-month retention)
CREATE OR REPLACE FUNCTION cleanup_old_games()
RETURNS void AS $$
BEGIN
    -- Delete finished games older than 1 month
    DELETE FROM games 
    WHERE status = 'finished' 
    AND updated_at < NOW() - INTERVAL '1 month';
    
    -- Delete abandoned games older than 1 week
    DELETE FROM games 
    WHERE status = 'active' 
    AND updated_at < NOW() - INTERVAL '1 week'
    AND created_at < NOW() - INTERVAL '1 week';
END;
$$ LANGUAGE plpgsql;

-- 2. Get games statistics
CREATE OR REPLACE FUNCTION get_games_stats()
RETURNS TABLE (
    total_games bigint,
    games_last_week bigint,
    games_last_month bigint,
    active_games bigint,
    finished_games bigint,
    game_types_breakdown jsonb,
    oldest_game timestamptz,
    newest_game timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_games,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 week') as games_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') as games_last_month,
        COUNT(*) FILTER (WHERE status = 'active') as active_games,
        COUNT(*) FILTER (WHERE status = 'finished') as finished_games,
        (
            SELECT jsonb_object_agg(game_type, count)
            FROM (
                SELECT game_type, COUNT(*) as count
                FROM games
                GROUP BY game_type
                ORDER BY count DESC
            ) type_counts
        ) as game_types_breakdown,
        MIN(created_at) as oldest_game,
        MAX(created_at) as newest_game
    FROM games;
END;
$$ LANGUAGE plpgsql;