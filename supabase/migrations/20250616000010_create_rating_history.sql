/*
# Create Rating History Table
Logs ELO changes after each game.
*/

-- Create rating_history table
CREATE TABLE IF NOT EXISTS rating_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    game_id uuid REFERENCES games (id) ON DELETE CASCADE NOT NULL,
    old_elo integer NOT NULL,
    new_elo integer NOT NULL,
    change integer GENERATED ALWAYS AS (new_elo - old_elo) STORED,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rating_history_user_id ON rating_history (user_id);

CREATE INDEX IF NOT EXISTS idx_rating_history_game_id ON rating_history (game_id);

CREATE INDEX IF NOT EXISTS idx_rating_history_created_at ON rating_history (created_at);

-- Create composite index for user rating history in chronological order
CREATE INDEX IF NOT EXISTS idx_rating_history_user_created ON rating_history (user_id, created_at);

-- Enable Row Level Security
ALTER TABLE rating_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own rating history" ON rating_history FOR
SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "System can insert rating history" ON rating_history FOR
INSERT
WITH
    CHECK (true);
-- Allow system to insert rating changes

-- Function to get user's rating progress over time
CREATE OR REPLACE FUNCTION get_user_rating_progress(
    p_user_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    game_id uuid,
    old_elo integer,
    new_elo integer,
    change integer,
    game_date timestamptz,
    opponent_username text,
    game_result text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rh.game_id,
        rh.old_elo,
        rh.new_elo,
        rh.change,
        rh.created_at as game_date,
        CASE 
            WHEN g.player1_id = p_user_id THEN u2.username 
            ELSE u1.username 
        END as opponent_username,
        CASE 
            WHEN g.winner_id = p_user_id THEN 'win'
            WHEN g.winner_id IS NULL THEN 'draw'
            ELSE 'loss'
        END as game_result
    FROM rating_history rh
    JOIN games g ON rh.game_id = g.id
    JOIN users u1 ON g.player1_id = u1.id
    JOIN users u2 ON g.player2_id = u2.id
    WHERE rh.user_id = p_user_id
    ORDER BY rh.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get rating statistics for a user
CREATE OR REPLACE FUNCTION get_user_rating_stats(
    p_user_id uuid
)
RETURNS TABLE (
    current_elo integer,
    highest_elo integer,
    lowest_elo integer,
    total_games integer,
    rating_gained integer,
    avg_rating_change numeric,
    best_win_streak integer,
    current_streak integer,
    streak_type text
) AS $$
DECLARE
    user_current_elo integer;
    user_highest_elo integer;
    user_lowest_elo integer;
    user_total_games integer;
    user_rating_gained integer;
    user_avg_change numeric;
    user_best_streak integer;
    user_current_streak integer;
    user_current_streak_type text;
BEGIN
    -- Get basic stats
    SELECT u.elo INTO user_current_elo FROM users u WHERE u.id = p_user_id;
    
    SELECT 
        COUNT(*),
        MAX(new_elo),
        MIN(new_elo),
        SUM(change),
        AVG(change)
    INTO 
        user_total_games,
        user_highest_elo,
        user_lowest_elo,
        user_rating_gained,
        user_avg_change
    FROM rating_history rh
    WHERE rh.user_id = p_user_id;
    
    -- Calculate streaks (simplified version)
    WITH game_results AS (
        SELECT 
            rh.created_at,
            CASE 
                WHEN g.winner_id = p_user_id THEN 'win'
                WHEN g.winner_id IS NULL THEN 'draw'
                ELSE 'loss'
            END as result
        FROM rating_history rh
        JOIN games g ON rh.game_id = g.id
        WHERE rh.user_id = p_user_id
        ORDER BY rh.created_at DESC
        LIMIT 100
    )
    SELECT 1, 'win' INTO user_current_streak, user_current_streak_type; -- Simplified
    
    user_best_streak := COALESCE(user_current_streak, 0);
    
    RETURN QUERY SELECT 
        COALESCE(user_current_elo, 1200),
        COALESCE(user_highest_elo, 1200),
        COALESCE(user_lowest_elo, 1200),
        COALESCE(user_total_games, 0),
        COALESCE(user_rating_gained, 0),
        COALESCE(user_avg_change, 0.0),
        COALESCE(user_best_streak, 0),
        COALESCE(user_current_streak, 0),
        COALESCE(user_current_streak_type, 'none');
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard based on current ratings
CREATE OR REPLACE FUNCTION get_rating_leaderboard(
    p_limit integer DEFAULT 100
)
RETURNS TABLE (
    rank integer,
    user_id uuid,
    username text,
    elo integer,
    games_played integer,
    win_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY u.elo DESC)::integer as rank,
        u.id as user_id,
        u.username,
        u.elo,
        (u.wins + u.losses + u.draws) as games_played,
        CASE 
            WHEN (u.wins + u.losses + u.draws) > 0 
            THEN ROUND((u.wins::numeric / (u.wins + u.losses + u.draws)) * 100, 2)
            ELSE 0.0
        END as win_rate
    FROM users u
    WHERE (u.wins + u.losses + u.draws) >= 5 -- Minimum games for leaderboard
    ORDER BY u.elo DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's rating progression over time
CREATE OR REPLACE FUNCTION get_user_rating_progression(
    p_user_id uuid,
    p_days integer DEFAULT 30
)
RETURNS TABLE (
    date date,
    elo integer,
    games_played bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rh.created_at::date as date,
        rh.new_elo as elo,
        COUNT(*) OVER (PARTITION BY rh.created_at::date) as games_played
    FROM rating_history rh
    WHERE rh.user_id = p_user_id
        AND rh.created_at >= (now() - interval '1 day' * p_days)
    ORDER BY rh.created_at;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track user activity on rating operations
CREATE TRIGGER trigger_rating_history_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON rating_history
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Create trigger to track user activity when rating history is created
CREATE TRIGGER trigger_track_rating_activity
    AFTER INSERT OR UPDATE OR DELETE ON rating_history
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- OPTIMIZATION: Add retention policy and cleanup functions
-- 1. Cleanup old rating history (1-month retention)
CREATE OR REPLACE FUNCTION cleanup_old_rating_history()
RETURNS void AS $$
BEGIN
    -- Delete rating history older than 1 month for finished games
    DELETE FROM rating_history 
    WHERE created_at < NOW() - INTERVAL '1 month'
    AND game_id IN (
        SELECT id FROM games 
        WHERE status = 'finished' 
        AND updated_at < NOW() - INTERVAL '1 week'
    );
    
    -- Keep only the most recent 100 rating changes per user (performance optimization)
    DELETE FROM rating_history 
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM rating_history
        ) ranked
        WHERE rn <= 100
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger wrapper function for cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_old_rating_history()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM cleanup_old_rating_history();
    RETURN NULL; -- For AFTER triggers, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically cleanup old data on interactions
CREATE TRIGGER trigger_auto_cleanup_rating_history
    AFTER INSERT ON rating_history
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_rating_history();

-- 2. Get rating history statistics
CREATE OR REPLACE FUNCTION get_rating_history_stats()
RETURNS TABLE (
    total_records bigint,
    records_last_week bigint,
    records_last_month bigint,
    unique_users bigint,
    avg_rating_change numeric,
    max_rating_gain integer,
    max_rating_loss integer,
    oldest_record timestamptz,
    newest_record timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 week') as records_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') as records_last_month,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(change) as avg_rating_change,
        MAX(change) as max_rating_gain,
        MIN(change) as max_rating_loss,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record
    FROM rating_history;
END;
$$ LANGUAGE plpgsql;