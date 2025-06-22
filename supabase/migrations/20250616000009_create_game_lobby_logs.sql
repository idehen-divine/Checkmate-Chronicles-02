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

-- Create trigger to track user activity when lobby logs are created
CREATE TRIGGER trigger_track_lobby_activity
    AFTER INSERT OR UPDATE OR DELETE ON game_lobby_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Create trigger to automatically cleanup old data on interactions
CREATE TRIGGER trigger_auto_cleanup_lobby_logs
    AFTER INSERT ON game_lobby_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_old_game_lobby_logs();

-- OPTIMIZATION: Add retention policy and cleanup functions
-- 1. Cleanup old game lobby logs (1-month retention)
CREATE OR REPLACE FUNCTION cleanup_old_game_lobby_logs()
RETURNS void AS $$
BEGIN
    -- Delete lobby logs older than 1 month for finished games
    DELETE FROM game_lobby_logs 
    WHERE created_at < NOW() - INTERVAL '1 month'
    AND game_id IN (
        SELECT id FROM games 
        WHERE status = 'finished' 
        AND updated_at < NOW() - INTERVAL '1 week'
    );
    
    -- For active games, keep lobby logs for last 7 days only
    DELETE FROM game_lobby_logs 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND game_id IN (
        SELECT id FROM games WHERE status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Get game lobby logs statistics
CREATE OR REPLACE FUNCTION get_game_lobby_logs_stats()
RETURNS TABLE (
    total_logs bigint,
    logs_last_week bigint,
    logs_last_month bigint,
    active_game_logs bigint,
    finished_game_logs bigint,
    entered_logs bigint,
    left_logs bigint,
    ready_logs bigint,
    oldest_log timestamptz,
    newest_log timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 week') as logs_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') as logs_last_month,
        COUNT(*) FILTER (WHERE game_id IN (SELECT id FROM games WHERE status = 'active')) as active_game_logs,
        COUNT(*) FILTER (WHERE game_id IN (SELECT id FROM games WHERE status = 'finished')) as finished_game_logs,
        COUNT(*) FILTER (WHERE event = 'entered_lobby') as entered_logs,
        COUNT(*) FILTER (WHERE event = 'left_lobby') as left_logs,
        COUNT(*) FILTER (WHERE event = 'ready') as ready_logs,
        MIN(created_at) as oldest_log,
        MAX(created_at) as newest_log
    FROM game_lobby_logs;
END;
$$ LANGUAGE plpgsql;