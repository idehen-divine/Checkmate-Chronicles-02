/*
# Create Rating History System

1. New Tables
- `user_rating_history` - Track all ELO rating changes over time

2. Functions
- Function to record rating changes after games
- Function to get rating progression data

3. Security
- Enable RLS with user-specific access
*/

-- Create rating history table
CREATE TABLE IF NOT EXISTS user_rating_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES users (id) ON DELETE CASCADE,
    game_id uuid REFERENCES games (id) ON DELETE SET NULL,
    old_elo integer NOT NULL,
    new_elo integer NOT NULL,
    elo_change integer NOT NULL,
    old_rank_id uuid REFERENCES chess_ranks (id),
    new_rank_id uuid REFERENCES chess_ranks (id),
    game_result text, -- 'win', 'loss', 'draw'
    opponent_id uuid REFERENCES users (id) ON DELETE SET NULL,
    opponent_elo integer,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_rating_history_user_id ON user_rating_history (user_id);
CREATE INDEX idx_rating_history_created_at ON user_rating_history (created_at);
CREATE INDEX idx_rating_history_game_id ON user_rating_history (game_id);

-- Enable Row Level Security
ALTER TABLE user_rating_history ENABLE ROW LEVEL SECURITY;

-- Create policies for rating history
CREATE POLICY "Users can read own rating history" ON user_rating_history FOR
SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "System can insert rating history" ON user_rating_history FOR
INSERT
    TO authenticated
WITH
    CHECK (true);

-- Create function to record rating change
CREATE OR REPLACE FUNCTION record_rating_change(
  p_user_id uuid,
  p_game_id uuid,
  p_old_elo integer,
  p_new_elo integer,
  p_old_rank_id uuid,
  p_new_rank_id uuid,
  p_game_result text,
  p_opponent_id uuid DEFAULT NULL,
  p_opponent_elo integer DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_rating_history (
    user_id,
    game_id,
    old_elo,
    new_elo,
    elo_change,
    old_rank_id,
    new_rank_id,
    game_result,
    opponent_id,
    opponent_elo
  ) VALUES (
    p_user_id,
    p_game_id,
    p_old_elo,
    p_new_elo,
    p_new_elo - p_old_elo,
    p_old_rank_id,
    p_new_rank_id,
    p_game_result,
    p_opponent_id,
    p_opponent_elo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's rating progression
CREATE OR REPLACE FUNCTION get_rating_progression(p_user_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE (
  date timestamptz,
  elo integer,
  elo_change integer,
  rank_name text,
  game_result text,
  opponent_username text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    urh.created_at as date,
    urh.new_elo as elo,
    urh.elo_change,
    cr.display_name as rank_name,
    urh.game_result,
    u.username as opponent_username
  FROM user_rating_history urh
  LEFT JOIN chess_ranks cr ON urh.new_rank_id = cr.id
  LEFT JOIN users u ON urh.opponent_id = u.id
  WHERE urh.user_id = p_user_id
  ORDER BY urh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;