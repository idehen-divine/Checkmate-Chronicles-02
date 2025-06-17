/*
# Create Games Table

1. New Table
- `games` - Chess game records and state

2. Enums
- `game_status` - Standardized game status values

3. Security
- Enable RLS on games table
- Add policies for game management

4. Functions & Triggers
- Automatically update player ratings when games finish
- Record rating history after game completion
*/

-- Create game status enum
CREATE TYPE game_status AS ENUM (
    'not_started',    -- Game created but not yet begun
    'active',         -- Game is currently in progress
    'paused',         -- Game temporarily paused
    'completed',      -- Game finished normally (checkmate, resignation, etc.)
    'abandoned',      -- Game abandoned by one or both players
    'timeout',        -- Game ended due to time limit
    'draw_agreed',    -- Players agreed to a draw
    'draw_stalemate', -- Game ended in stalemate
    'draw_repetition',-- Game ended due to threefold repetition
    'draw_50_moves',  -- Game ended due to 50-move rule
    'draw_insufficient' -- Game ended due to insufficient material
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    player1_id uuid REFERENCES users (id) ON DELETE CASCADE,
    player2_id uuid REFERENCES users (id) ON DELETE CASCADE,
    game_state jsonb NOT NULL DEFAULT '{}',
    status game_status NOT NULL DEFAULT 'not_started',
    created_at timestamptz DEFAULT now(),
    started_at timestamptz,
    finished_at timestamptz
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
CREATE POLICY "Users can read their games" ON games FOR
SELECT TO authenticated USING (
        auth.uid () = player1_id
        OR auth.uid () = player2_id
    );

CREATE POLICY "Users can create games" ON games FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = player1_id);

CREATE POLICY "Players can update their games" ON games FOR
UPDATE TO authenticated USING (
    auth.uid () = player1_id
    OR auth.uid () = player2_id
);

-- Helper function to get rank by ELO
CREATE OR REPLACE FUNCTION get_rank_by_elo(elo_rating integer)
RETURNS uuid AS $$
DECLARE
  rank_id uuid;
BEGIN
  SELECT id INTO rank_id
  FROM chess_ranks
  WHERE elo_rating >= min_elo 
  AND (max_elo IS NULL OR elo_rating <= max_elo)
  ORDER BY rank_order DESC
  LIMIT 1;
  
  RETURN rank_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update game ratings when game finishes
CREATE OR REPLACE FUNCTION update_game_ratings()
RETURNS TRIGGER AS $$
DECLARE
  player1_old_elo integer;
  player2_old_elo integer;
  player1_new_elo integer;
  player2_new_elo integer;
  player1_old_rank uuid;
  player2_old_rank uuid;
  player1_new_rank uuid;
  player2_new_rank uuid;
  winner_id uuid;
  p1_result text;
  p2_result text;
BEGIN
  -- Only process when game status changes to a finished state
  IF (NEW.status IN ('completed', 'timeout', 'draw_agreed', 'draw_stalemate', 'draw_repetition', 'draw_50_moves', 'draw_insufficient')) 
     AND (OLD.status NOT IN ('completed', 'timeout', 'draw_agreed', 'draw_stalemate', 'draw_repetition', 'draw_50_moves', 'draw_insufficient')) THEN
    
    -- Set finished_at timestamp
    NEW.finished_at = now();
    
    -- Get current ratings
    SELECT current_elo, current_rank_id INTO player1_old_elo, player1_old_rank
    FROM users WHERE id = NEW.player1_id;
    
    SELECT current_elo, current_rank_id INTO player2_old_elo, player2_old_rank
    FROM users WHERE id = NEW.player2_id;
    
    -- Determine game result based on status and game_state
    IF NEW.status = 'completed' THEN
      winner_id := (NEW.game_state->>'winner')::uuid;
      
      IF winner_id = NEW.player1_id THEN
        -- Player 1 wins
        player1_new_elo := player1_old_elo + LEAST(32, GREATEST(8, 32 - (player1_old_elo - player2_old_elo) / 100));
        player2_new_elo := player2_old_elo - LEAST(32, GREATEST(8, 32 - (player1_old_elo - player2_old_elo) / 100));
        p1_result := 'win';
        p2_result := 'loss';
      ELSIF winner_id = NEW.player2_id THEN
        -- Player 2 wins
        player2_new_elo := player2_old_elo + LEAST(32, GREATEST(8, 32 - (player2_old_elo - player1_old_elo) / 100));
        player1_new_elo := player1_old_elo - LEAST(32, GREATEST(8, 32 - (player2_old_elo - player1_old_elo) / 100));
        p1_result := 'loss';
        p2_result := 'win';
      ELSE
        -- Draw in completed game
        player1_new_elo := player1_old_elo;
        player2_new_elo := player2_old_elo;
        p1_result := 'draw';
        p2_result := 'draw';
      END IF;
    ELSIF NEW.status IN ('draw_agreed', 'draw_stalemate', 'draw_repetition', 'draw_50_moves', 'draw_insufficient') THEN
      -- All draw scenarios
      player1_new_elo := player1_old_elo;
      player2_new_elo := player2_old_elo;
      p1_result := 'draw';
      p2_result := 'draw';
    ELSIF NEW.status = 'timeout' THEN
      -- Timeout - winner determined by who didn't timeout
      winner_id := (NEW.game_state->>'winner')::uuid;
      
      IF winner_id = NEW.player1_id THEN
        player1_new_elo := player1_old_elo + LEAST(32, GREATEST(8, 32 - (player1_old_elo - player2_old_elo) / 100));
        player2_new_elo := player2_old_elo - LEAST(32, GREATEST(8, 32 - (player1_old_elo - player2_old_elo) / 100));
        p1_result := 'win';
        p2_result := 'loss';
      ELSE
        player2_new_elo := player2_old_elo + LEAST(32, GREATEST(8, 32 - (player2_old_elo - player1_old_elo) / 100));
        player1_new_elo := player1_old_elo - LEAST(32, GREATEST(8, 32 - (player2_old_elo - player1_old_elo) / 100));
        p1_result := 'loss';
        p2_result := 'win';
      END IF;
    END IF;
    
    -- Get new ranks
    player1_new_rank := get_rank_by_elo(player1_new_elo);
    player2_new_rank := get_rank_by_elo(player2_new_elo);
    
    -- Update user ratings and stats
    UPDATE users SET 
      current_elo = player1_new_elo,
      highest_elo = GREATEST(highest_elo, player1_new_elo),
      current_rank_id = player1_new_rank,
      games_played = games_played + 1,
      wins = wins + CASE WHEN p1_result = 'win' THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN p1_result = 'loss' THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN p1_result = 'draw' THEN 1 ELSE 0 END
    WHERE id = NEW.player1_id;
    
    UPDATE users SET 
      current_elo = player2_new_elo,
      highest_elo = GREATEST(highest_elo, player2_new_elo),
      current_rank_id = player2_new_rank,
      games_played = games_played + 1,
      wins = wins + CASE WHEN p2_result = 'win' THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN p2_result = 'loss' THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN p2_result = 'draw' THEN 1 ELSE 0 END
    WHERE id = NEW.player2_id;
    
    -- Record rating history (if rating history table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_rating_history') THEN
      PERFORM record_rating_change(
        NEW.player1_id, NEW.id, player1_old_elo, player1_new_elo,
        player1_old_rank, player1_new_rank, p1_result,
        NEW.player2_id, player2_old_elo
      );
      
      PERFORM record_rating_change(
        NEW.player2_id, NEW.id, player2_old_elo, player2_new_elo,
        player2_old_rank, player2_new_rank, p2_result,
        NEW.player1_id, player1_old_elo
      );
    END IF;
    
  END IF;
  
  -- Set started_at timestamp when game moves from not_started to active
  IF NEW.status = 'active' AND OLD.status = 'not_started' THEN
    NEW.started_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic rating updates when games finish
CREATE TRIGGER trigger_update_game_ratings
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_game_ratings();