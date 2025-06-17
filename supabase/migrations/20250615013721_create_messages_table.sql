/*
# Create Messages Table

1. New Table
- `message` - Chat messages

2. Security
- Enable RLS on messages table
- Add policies for message management

3. Indexes
- Performance indexes for message queries
*/

-- Create message table
CREATE TABLE IF NOT EXISTS message (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    chat_id uuid REFERENCES chat (id) ON DELETE CASCADE,
    user_id uuid REFERENCES users (id) ON DELETE CASCADE,
    text text NOT NULL,
    timestamp timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_chat_id ON message(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_timestamp ON message(timestamp);

-- Enable Row Level Security
ALTER TABLE message ENABLE ROW LEVEL SECURITY;

-- Create policies for message table
CREATE POLICY "Users can read messages from their game chats" ON message FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM chat
                JOIN games ON games.id = chat.game_id
            WHERE
                chat.id = message.chat_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Users can insert messages in their game chats" ON message FOR
INSERT
    TO authenticated
WITH
    CHECK (
        auth.uid () = user_id
        AND EXISTS (
            SELECT 1
            FROM chat
                JOIN games ON games.id = chat.game_id
            WHERE
                chat.id = message.chat_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    ); 