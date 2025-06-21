/*
# Create Users Table

1. New Tables
- `users` - User profiles with Algorand wallet integration and chess rating system

2. Security
- Enable RLS on users table
- Add policies for user profile management

3. Chess Rating System
- ELO rating system with current and highest ratings
- Game statistics (wins, losses, draws, games played)
- Reference to chess ranks

4. Functions & Triggers
- Automatically update user ranks based on ELO changes
- Set initial ranks for new users
*/

-- Create users table with rating fields included
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  algorand_wallet_address text,
  algorand_private_key text,
  algorand_secret_phrase text,

-- Chess Rating System Fields

current_elo INTEGER DEFAULT 1000 NOT NULL,
highest_elo INTEGER DEFAULT 1000 NOT NULL,
current_rank_id UUID REFERENCES chess_ranks (id),
wins INTEGER DEFAULT 0 NOT NULL,
losses INTEGER DEFAULT 0 NOT NULL,
draws INTEGER DEFAULT 0 NOT NULL,
games_played INTEGER DEFAULT 0 NOT NULL,

-- User Preferences
sounds_enabled BOOLEAN DEFAULT true,
  hints_enabled BOOLEAN DEFAULT true,
  legal_moves_enabled BOOLEAN DEFAULT true,
  game_invites_enabled BOOLEAN DEFAULT true,
  nft_mints_enabled BOOLEAN DEFAULT true,
  announcements_enabled BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX idx_users_current_rank ON users (current_rank_id);

CREATE INDEX idx_users_current_elo ON users (current_elo);

CREATE INDEX idx_users_username ON users (username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own profile" ON users FOR
SELECT TO authenticated USING (auth.uid () = id);

CREATE POLICY "Users can update own profile" ON users FOR
UPDATE TO authenticated USING (auth.uid () = id);

CREATE POLICY "Users can insert own profile" ON users FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = id);

-- Function to automatically update user rank based on ELO
CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's rank based on their current ELO
    UPDATE users 
    SET current_rank_id = (
        SELECT id 
        FROM chess_ranks 
        WHERE NEW.current_elo >= min_elo 
        AND (max_elo IS NULL OR NEW.current_elo <= max_elo)
        ORDER BY rank_order DESC 
        LIMIT 1
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update rank when ELO changes
CREATE TRIGGER trigger_update_user_rank
    AFTER UPDATE OF current_elo ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rank();

-- Create trigger to set initial rank when user is created
CREATE TRIGGER trigger_set_initial_user_rank
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rank();

-- Function to set user rank on registration (can be called manually if needed)
CREATE OR REPLACE FUNCTION set_initial_user_rank(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET current_rank_id = (
        SELECT id 
        FROM chess_ranks 
        WHERE current_elo >= min_elo 
        AND (max_elo IS NULL OR current_elo <= max_elo)
        ORDER BY rank_order DESC 
        LIMIT 1
    )
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;