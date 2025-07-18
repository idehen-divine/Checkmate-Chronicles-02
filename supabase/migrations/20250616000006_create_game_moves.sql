/*
# Create Game Moves Table
Stores individual moves for each game.
*/

-- Create game_moves table
CREATE TABLE IF NOT EXISTS game_moves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE NOT NULL,
    player_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    move text NOT NULL, -- The move (e.g., "e4", "Nf3")
    move_number integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves (game_id);

CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON game_moves (player_id);

CREATE INDEX IF NOT EXISTS idx_game_moves_move_number ON game_moves (move_number);

CREATE INDEX IF NOT EXISTS idx_game_moves_created_at ON game_moves (created_at);

-- Create composite index for game moves in order
CREATE INDEX IF NOT EXISTS idx_game_moves_game_move_number ON game_moves (game_id, move_number);

-- Enable Row Level Security
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read moves from their games" ON game_moves FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_moves.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can insert moves in their games" ON game_moves FOR
INSERT
    TO authenticated
WITH
    CHECK (
        auth.uid () = player_id
        AND EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_moves.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
                AND games.status = 'active'
        )
    );

-- Function to validate move insertion
CREATE OR REPLACE FUNCTION validate_move_insertion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if it's the player's turn
    -- This is a simplified check - in reality you'd check game state
    IF (NEW.move_number % 2 = 1 AND NEW.player_id != (SELECT player1_id FROM games WHERE id = NEW.game_id)) OR
       (NEW.move_number % 2 = 0 AND NEW.player_id != (SELECT player2_id FROM games WHERE id = NEW.game_id)) THEN
        RAISE EXCEPTION 'Not your turn to move';
    END IF;
    
    -- Check if move number is correct (should be next in sequence)
    IF NEW.move_number != (
        SELECT COALESCE(MAX(move_number), 0) + 1 
        FROM game_moves 
        WHERE game_id = NEW.game_id
    ) THEN
        RAISE EXCEPTION 'Invalid move number';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate moves
CREATE TRIGGER trigger_validate_move_insertion
    BEFORE INSERT ON game_moves
    FOR EACH ROW
    EXECUTE FUNCTION validate_move_insertion();

-- Auto-update user's last_seen when they make a move
CREATE OR REPLACE FUNCTION update_player_activity_on_move()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET 
        last_seen_at = NEW.created_at,
        last_seen_method = 'making_move',
        is_online = true
    WHERE id = NEW.player_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_activity_on_move
    AFTER INSERT ON game_moves
    FOR EACH ROW
    EXECUTE FUNCTION update_player_activity_on_move();

-- Create trigger to track user activity on move operations
CREATE TRIGGER trigger_game_moves_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON game_moves
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Function to update game timestamp when move is made
CREATE OR REPLACE FUNCTION update_game_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the game's updated_at timestamp when a move is made
    UPDATE games 
    SET updated_at = NEW.created_at 
    WHERE id = NEW.game_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update game updated_at when move is made
CREATE TRIGGER trigger_update_game_timestamp
    AFTER INSERT ON game_moves
    FOR EACH ROW
    EXECUTE FUNCTION update_game_timestamp();

-- OPTIMIZATION: Add retention policy and cleanup functions
-- 1. Cleanup old game moves (1-month retention)
CREATE OR REPLACE FUNCTION cleanup_old_game_moves()
RETURNS void AS $$
BEGIN
    -- Delete moves older than 1 month for finished games
    DELETE FROM game_moves 
    WHERE created_at < NOW() - INTERVAL '1 month'
    AND game_id IN (
        SELECT id FROM games 
        WHERE status = 'finished' 
        AND updated_at < NOW() - INTERVAL '1 week'
    );
    
    -- For active games, keep moves for last 7 days only
    DELETE FROM game_moves 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND game_id IN (
        SELECT id FROM games WHERE status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger wrapper function for cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_old_game_moves()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM cleanup_old_game_moves();
    RETURN NULL; -- For AFTER triggers, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically cleanup old data on interactions
CREATE TRIGGER trigger_auto_cleanup_moves
    AFTER INSERT ON game_moves
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_game_moves();

-- 2. Get game moves statistics
CREATE OR REPLACE FUNCTION get_game_moves_stats()
RETURNS TABLE (
    total_moves bigint,
    moves_last_week bigint,
    moves_last_month bigint,
    active_game_moves bigint,
    finished_game_moves bigint,
    oldest_move timestamptz,
    newest_move timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_moves,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 week') as moves_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') as moves_last_month,
        COUNT(*) FILTER (WHERE game_id IN (SELECT id FROM games WHERE status = 'active')) as active_game_moves,
        COUNT(*) FILTER (WHERE game_id IN (SELECT id FROM games WHERE status = 'finished')) as finished_game_moves,
        MIN(created_at) as oldest_move,
        MAX(created_at) as newest_move
    FROM game_moves;
END;
$$ LANGUAGE plpgsql;