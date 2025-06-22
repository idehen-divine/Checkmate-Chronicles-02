/*
# Create Game Lobby Logs Table
Tracks lobby behavior for debugging and analytics.
*/

-- Create game_lobby_logs table
CREATE TABLE IF NOT EXISTS game_lobby_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE NOT NULL,
    player_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    event text NOT NULL CHECK (
        event IN (
            'entered_lobby',
            'left_lobby',
            'ready',
            'not_ready',
            'timeout',
            'kicked',
            'connection_lost',
            'reconnected'
        )
    ),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_lobby_logs_game_id ON game_lobby_logs (game_id);

CREATE INDEX IF NOT EXISTS idx_game_lobby_logs_player_id ON game_lobby_logs (player_id);

CREATE INDEX IF NOT EXISTS idx_game_lobby_logs_event ON game_lobby_logs (event);

CREATE INDEX IF NOT EXISTS idx_game_lobby_logs_created_at ON game_lobby_logs (created_at);

-- Create composite index for game lobby events in chronological order
CREATE INDEX IF NOT EXISTS idx_game_lobby_logs_game_created ON game_lobby_logs (game_id, created_at);

-- Enable Row Level Security
ALTER TABLE game_lobby_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read lobby logs from their games" ON game_lobby_logs FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_lobby_logs.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can create lobby logs for their games" ON game_lobby_logs FOR
INSERT
    TO authenticated
WITH
    CHECK (
        auth.uid () = player_id
        AND EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_lobby_logs.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

-- Function to log lobby events
CREATE OR REPLACE FUNCTION log_lobby_event(
    p_game_id uuid,
    p_player_id uuid,
    p_event text
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO game_lobby_logs (game_id, player_id, event)
    VALUES (p_game_id, p_player_id, p_event)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Note: Player join events are now handled by triggers in the games table migration

-- Function to get lobby statistics for analytics
CREATE OR REPLACE FUNCTION get_lobby_statistics(
    p_game_id uuid
)
RETURNS TABLE (
    player_id uuid,
    username text,
    entered_at timestamptz,
    ready_at timestamptz,
    total_lobby_time interval
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as player_id,
        u.username,
        entered.created_at as entered_at,
        ready.created_at as ready_at,
        (ready.created_at - entered.created_at) as total_lobby_time
    FROM users u
    LEFT JOIN (
        SELECT player_id, created_at
        FROM game_lobby_logs 
        WHERE game_id = p_game_id AND event = 'entered_lobby'
    ) entered ON u.id = entered.player_id
    LEFT JOIN (
        SELECT player_id, created_at
        FROM game_lobby_logs 
        WHERE game_id = p_game_id AND event = 'ready'
    ) ready ON u.id = ready.player_id
    WHERE u.id IN (
        SELECT player1_id FROM games WHERE id = p_game_id
        UNION
        SELECT player2_id FROM games WHERE id = p_game_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track user activity on lobby operations
CREATE TRIGGER trigger_game_lobby_logs_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON game_lobby_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();