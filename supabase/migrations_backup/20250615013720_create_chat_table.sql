/*
# Create Chat Table

1. New Table
- `chat` - Game chat rooms

2. Security
- Enable RLS on chat table
- Add policies for chat management
*/

-- Create chat table
CREATE TABLE IF NOT EXISTS chat (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;

-- Create policies for chat table
CREATE POLICY "Users can read chat from their games" ON chat FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = chat.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Users can create chat for their games" ON chat FOR
INSERT
    TO authenticated
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = chat.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );