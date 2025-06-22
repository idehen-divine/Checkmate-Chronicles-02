/*
# Create Matchmaking Queue Table
Handles finding and pairing players.
*/

-- Create matchmaking_queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    player_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    game_type text NOT NULL, -- Can be: quick-match, tournament, custom, etc.
    status text DEFAULT 'waiting' CHECK (
        status IN (
            'waiting',
            'matching',
            'matched',
            'cancelled'
        )
    ) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT unique_player_queue UNIQUE (player_id) -- One queue entry per player
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_player_id ON matchmaking_queue (player_id);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game_type ON matchmaking_queue (game_type);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_status ON matchmaking_queue (status);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_created_at ON matchmaking_queue (created_at);

-- Enable Row Level Security
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all queue entries" ON matchmaking_queue FOR
SELECT TO authenticated USING (true);
-- Allow reading all entries for matchmaking

CREATE POLICY "Users can manage own queue entry" ON matchmaking_queue FOR ALL TO authenticated USING (auth.uid () = player_id)
WITH
    CHECK (auth.uid () = player_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_matchmaking_queue_updated_at
    BEFORE UPDATE ON matchmaking_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to track user activity on matchmaking operations
CREATE TRIGGER trigger_matchmaking_queue_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON matchmaking_queue
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Create trigger to track user activity when matchmaking queue is modified
CREATE TRIGGER trigger_track_matchmaking_activity
    AFTER INSERT OR UPDATE OR DELETE ON matchmaking_queue
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Create trigger to automatically cleanup old data on interactions
CREATE TRIGGER trigger_auto_cleanup_matchmaking_queue
    AFTER INSERT ON matchmaking_queue
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_old_matchmaking_queue();

-- Function to clean up old queue entries (older than 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS void AS $$
BEGIN
    DELETE FROM matchmaking_queue 
    WHERE created_at < now() - interval '30 minutes'
    AND status = 'waiting';
END;
$$ LANGUAGE plpgsql;

-- Create a function to be called periodically to clean up old entries
-- This can be called by a cron job or application logic

-- Create trigger to track user activity when matchmaking queue is modified
CREATE TRIGGER trigger_track_matchmaking_activity
    AFTER INSERT OR UPDATE OR DELETE ON matchmaking_queue
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- OPTIMIZATION: Add retention policy and cleanup functions
-- 1. Cleanup old matchmaking queue entries (1-month retention)
CREATE OR REPLACE FUNCTION cleanup_old_matchmaking_queue()
RETURNS void AS $$
BEGIN
    -- Delete queue entries older than 1 month
    DELETE FROM matchmaking_queue 
    WHERE created_at < NOW() - INTERVAL '1 month';
    
    -- Delete stale queue entries (older than 1 hour without being matched)
    DELETE FROM matchmaking_queue 
    WHERE created_at < NOW() - INTERVAL '1 hour'
    AND status = 'waiting';
    
    -- Clean up entries for users who are no longer online
    DELETE FROM matchmaking_queue 
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE last_seen_at < NOW() - INTERVAL '5 minutes'
        AND is_online = false
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Get matchmaking queue statistics
CREATE OR REPLACE FUNCTION get_matchmaking_queue_stats()
RETURNS TABLE (
    total_entries bigint,
    entries_last_week bigint,
    entries_last_month bigint,
    waiting_entries bigint,
    matched_entries bigint,
    cancelled_entries bigint,
    game_types_breakdown jsonb,
    avg_wait_time interval,
    oldest_entry timestamptz,
    newest_entry timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_entries,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 week') as entries_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') as entries_last_month,
        COUNT(*) FILTER (WHERE status = 'waiting') as waiting_entries,
        COUNT(*) FILTER (WHERE status = 'matched') as matched_entries,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_entries,
        (
            SELECT jsonb_object_agg(game_type, count)
            FROM (
                SELECT game_type, COUNT(*) as count
                FROM matchmaking_queue
                GROUP BY game_type
                ORDER BY count DESC
            ) type_counts
        ) as game_types_breakdown,
        AVG(CASE WHEN status != 'waiting' THEN updated_at - created_at END) as avg_wait_time,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
    FROM matchmaking_queue;
END;
$$ LANGUAGE plpgsql;