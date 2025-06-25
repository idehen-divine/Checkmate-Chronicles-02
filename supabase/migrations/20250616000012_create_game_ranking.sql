/*
# Create Game Ranking Table
Defines rank tiers based on ELO rating.
*/

-- Create game_ranking table
CREATE TABLE IF NOT EXISTS game_ranking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    name text UNIQUE NOT NULL,
    min_elo integer NOT NULL,
    max_elo integer, -- NULL for infinity (highest rank)
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_elo_range CHECK (
        min_elo >= 0
        AND (
            max_elo IS NULL
            OR max_elo > min_elo
        )
    )
);

-- Create indexes for game_ranking
CREATE INDEX IF NOT EXISTS idx_game_ranking_name ON game_ranking (name);

CREATE INDEX IF NOT EXISTS idx_game_ranking_elo_range ON game_ranking (min_elo, max_elo);

-- Enable Row Level Security
ALTER TABLE game_ranking ENABLE ROW LEVEL SECURITY;

-- Create policies for game_ranking (read-only for authenticated users)
CREATE POLICY "Anyone can read game rankings" ON game_ranking FOR
SELECT TO authenticated USING (true);

-- Create trigger for updated_at
CREATE TRIGGER trigger_game_ranking_updated_at
    BEFORE UPDATE ON game_ranking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default ranking data
INSERT INTO
    game_ranking (
        name,
        min_elo,
        max_elo,
        description
    )
VALUES (
        'Beginner',
        0,
        999,
        'New to chess - learning the basics'
    ),
    (
        'Intermediate',
        1000,
        1499,
        'Developing chess skills and tactics'
    ),
    (
        'Advanced',
        1500,
        1899,
        'Strong player with solid understanding'
    ),
    (
        'Master',
        1900,
        2299,
        'Expert level with advanced strategies'
    ),
    (
        'Grandmaster',
        2300,
        NULL,
        'Elite chess mastery - the highest tier'
    ) ON CONFLICT (name) DO NOTHING;

-- Function to get user's current rank
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id uuid)
RETURNS TABLE (
    rank_id uuid,
    rank_name text,
    rank_description text,
    user_elo integer,
    min_elo integer,
    max_elo integer,
    progress_in_rank real
) AS $$
DECLARE
    user_elo_val integer;
BEGIN
    -- Get user's current ELO
    SELECT elo INTO user_elo_val FROM users WHERE id = p_user_id;
    
    IF user_elo_val IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        gr.id as rank_id,
        gr.name as rank_name,
        gr.description as rank_description,
        user_elo_val as user_elo,
        gr.min_elo,
        gr.max_elo,
        CASE 
            WHEN gr.max_elo IS NULL THEN 100.0 -- Grandmaster is always 100%
            ELSE ((user_elo_val - gr.min_elo)::real / (gr.max_elo - gr.min_elo)::real) * 100.0
        END as progress_in_rank
    FROM game_ranking gr
    WHERE user_elo_val >= gr.min_elo 
        AND (gr.max_elo IS NULL OR user_elo_val <= gr.max_elo)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get all ranks with user counts
CREATE OR REPLACE FUNCTION get_ranking_leaderboard()
RETURNS TABLE (
    rank_id uuid,
    rank_name text,
    rank_description text,
    min_elo integer,
    max_elo integer,
    user_count bigint,
    top_players jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gr.id as rank_id,
        gr.name as rank_name,
        gr.description as rank_description,
        gr.min_elo,
        gr.max_elo,
        COUNT(u.id) as user_count,
        jsonb_agg(
            jsonb_build_object(
                'user_id', u.id,
                'username', u.username,
                'elo', u.elo,
                'wins', u.wins,
                'losses', u.losses,
                'draws', u.draws
            ) ORDER BY u.elo DESC
        ) FILTER (WHERE u.id IS NOT NULL) as top_players
    FROM game_ranking gr
    LEFT JOIN users u ON (
        u.elo >= gr.min_elo 
        AND (gr.max_elo IS NULL OR u.elo <= gr.max_elo)
        AND u.status = 'active'
    )
    GROUP BY gr.id, gr.name, gr.description, gr.min_elo, gr.max_elo
    ORDER BY gr.min_elo;
END;
$$ LANGUAGE plpgsql;

-- Add activity tracking trigger
CREATE TRIGGER trigger_game_ranking_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON game_ranking
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();