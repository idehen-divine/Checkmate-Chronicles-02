/*
  # Initial Database Schema for Checkmate Chronicles

  1. New Tables
    - `users` - User profiles with Algorand wallet integration
    - `games` - Chess game records and state
    - `moves` - Individual chess moves history
    - `chat` - Game chat rooms
    - `message` - Chat messages
    - `nft_checkmates` - NFT metadata for checkmate moments

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  algorand_wallet_address text,
  algorand_private_key text,
  algorand_secret_phrase text
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid REFERENCES users(id) ON DELETE CASCADE,
  player2_id uuid REFERENCES users(id) ON DELETE CASCADE,
  game_state jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

-- Create moves table
CREATE TABLE IF NOT EXISTS moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid REFERENCES users(id) ON DELETE CASCADE,
  move_notation text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Create chat table
CREATE TABLE IF NOT EXISTS chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE
);

-- Create message table
CREATE TABLE IF NOT EXISTS message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chat(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Create nft_checkmates table
CREATE TABLE IF NOT EXISTS nft_checkmates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  winner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}',
  minted_at timestamptz DEFAULT now(),
  algorand_asset_id text
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_checkmates ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for games table
CREATE POLICY "Users can read their games"
  ON games
  FOR SELECT
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Create policies for moves table
CREATE POLICY "Users can read moves from their games"
  ON moves
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = moves.game_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can insert moves in their games"
  ON moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = moves.game_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

-- Create policies for chat table
CREATE POLICY "Users can read chat from their games"
  ON chat
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = chat.game_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create chat for their games"
  ON chat
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = chat.game_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

-- Create policies for message table
CREATE POLICY "Users can read messages from their game chats"
  ON message
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat 
      JOIN games ON games.id = chat.game_id
      WHERE chat.id = message.chat_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their game chats"
  ON message
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM chat 
      JOIN games ON games.id = chat.game_id
      WHERE chat.id = message.chat_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

-- Create policies for nft_checkmates table
CREATE POLICY "Users can read their NFTs"
  ON nft_checkmates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = winner_id);

CREATE POLICY "Users can create NFTs for their wins"
  ON nft_checkmates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = winner_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp);
CREATE INDEX IF NOT EXISTS idx_message_chat_id ON message(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_timestamp ON message(timestamp);
CREATE INDEX IF NOT EXISTS idx_nft_checkmates_winner ON nft_checkmates(winner_id);