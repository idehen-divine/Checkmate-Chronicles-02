/*
# Create Game Events Table
Stores in-game events for analytics/replay.
*/

-- Create game_events table
CREATE TABLE IF NOT EXISTS game_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE NOT NULL,
    player_id uuid REFERENCES users (id) ON DELETE CASCADE, -- Nullable for system events
    type text NOT NULL CHECK (
        type IN (
            'resign',
            'timeout',
            'disconnect',
            'reconnect',
            'draw_offer',
            'draw_accept',
            'draw_decline',
            'pause_request',
            'resume_request',
            'abort_request',
            'game_start',
            'game_end',
            'move_made'
        )
    ),
    details jsonb DEFAULT '{}', -- Optional additional data
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events (game_id);

CREATE INDEX IF NOT EXISTS idx_game_events_player_id ON game_events (player_id);

CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events (type);

CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events (created_at);

-- Create composite index for game events in chronological order
CREATE INDEX IF NOT EXISTS idx_game_events_game_created ON game_events (game_id, created_at);

-- Enable Row Level Security
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read events from their games" ON game_events FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_events.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can create events in their games" ON game_events FOR
INSERT
    TO authenticated
WITH
    CHECK (
        (
            auth.uid () = player_id
            OR player_id IS NULL
        )
        AND -- Allow system events
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_events.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

-- Function to log game events
CREATE OR REPLACE FUNCTION log_game_event(
    p_game_id uuid,
    p_player_id uuid,
    p_type text,
    p_details jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
    event_id uuid;
BEGIN
    INSERT INTO game_events (game_id, player_id, type, details)
    VALUES (p_game_id, p_player_id, p_type, p_details)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically log game status changes
CREATE OR REPLACE FUNCTION log_game_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when game status changes
    IF OLD.status != NEW.status THEN
        PERFORM log_game_event(
            NEW.id,
            NULL, -- System event
            CASE 
                WHEN NEW.status = 'active' THEN 'game_start'
                WHEN NEW.status = 'finished' THEN 'game_end'
                ELSE 'status_change'
            END,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'result', NEW.result,
                'winner_id', NEW.winner_id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log game status changes
CREATE TRIGGER trigger_log_game_status_change
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION log_game_status_change();

-- Function to automatically log moves as events
CREATE OR REPLACE FUNCTION log_move_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_game_event(
        NEW.game_id,
        NEW.player_id,
        'move_made',
        jsonb_build_object(
            'move', NEW.move,
            'move_number', NEW.move_number
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log moves as events
CREATE TRIGGER trigger_log_move_event
    AFTER INSERT ON game_moves
    FOR EACH ROW
    EXECUTE FUNCTION log_move_event();

-- OPTIMIZATION: Add retention policy and cleanup functions
-- 1. Add retention policy function (1-month retention)
CREATE OR REPLACE FUNCTION cleanup_old_game_events()
RETURNS void AS $$
BEGIN
    -- Delete events older than 1 month for finished games
    DELETE FROM game_events 
    WHERE created_at < NOW() - INTERVAL '1 month'
    AND game_id IN (
        SELECT id FROM games 
        WHERE status = 'finished' 
        AND updated_at < NOW() - INTERVAL '1 week'
    );
    
    -- Delete move events older than 1 month (keep other events same duration)
    DELETE FROM game_events 
    WHERE created_at < NOW() - INTERVAL '1 month'
    AND type = 'move_made'
    AND game_id IN (
        SELECT id FROM games WHERE status = 'finished'
    );
    
    -- For active games, keep events for last 7 days only
    DELETE FROM game_events 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND type = 'move_made'
    AND game_id IN (
        SELECT id FROM games WHERE status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Create archive table for old events
CREATE TABLE IF NOT EXISTS game_events_archive (
    LIKE game_events INCLUDING ALL
);

-- 3. Function to archive old events instead of deleting
CREATE OR REPLACE FUNCTION archive_old_game_events()
RETURNS void AS $$
BEGIN
    -- Archive events older than 1 month for finished games
    WITH archived_events AS (
        DELETE FROM game_events 
        WHERE created_at < NOW() - INTERVAL '1 month'
        AND game_id IN (
            SELECT id FROM games 
            WHERE status = 'finished' 
            AND updated_at < NOW() - INTERVAL '1 week'
        )
        RETURNING *
    )
    INSERT INTO game_events_archive 
    SELECT * FROM archived_events;
END;
$$ LANGUAGE plpgsql;

-- 4. Manual cleanup function with reporting
CREATE OR REPLACE FUNCTION manual_cleanup_game_events()
RETURNS TABLE (
    deleted_count bigint,
    message text
) AS $$
DECLARE
    deleted_events bigint := 0;
BEGIN
    -- Get count before cleanup
    SELECT COUNT(*) INTO deleted_events
    FROM game_events 
    WHERE created_at < NOW() - INTERVAL '1 month';
    
    -- Run cleanup
    PERFORM cleanup_old_game_events();
    
    -- Calculate what was actually deleted
    SELECT deleted_events - COUNT(*) INTO deleted_events
    FROM game_events 
    WHERE created_at < NOW() - INTERVAL '1 month';
    
    RETURN QUERY SELECT 
        deleted_events,
        format('Deleted %s events older than 1 month', deleted_events) as message;
END;
$$ LANGUAGE plpgsql;

-- 5. Get game events statistics
CREATE OR REPLACE FUNCTION get_game_events_stats()
RETURNS TABLE (
    total_events bigint,
    events_last_week bigint,
    events_last_month bigint,
    move_events_count bigint,
    game_events_count bigint,
    oldest_event timestamptz,
    newest_event timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 week') as events_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') as events_last_month,
        COUNT(*) FILTER (WHERE type = 'move_made') as move_events_count,
        COUNT(*) FILTER (WHERE type != 'move_made') as game_events_count,
        MIN(created_at) as oldest_event,
        MAX(created_at) as newest_event
    FROM game_events;
END;
$$ LANGUAGE plpgsql;