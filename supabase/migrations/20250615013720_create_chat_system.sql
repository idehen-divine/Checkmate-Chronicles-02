/*
  # Create Chat System Tables
  
  1. New Tables
    - `chat` - Game chat rooms
    - `message` - Chat messages
  
  2. Security
    - Enable RLS on both tables
    - Add policies for chat and message management
*/

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

-- Enable Row Level Security
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;

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