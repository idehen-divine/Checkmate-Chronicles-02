/*
# Create Moves Table

1. New Table
- `moves` - Individual chess moves history

2. Security
- Enable RLS on moves table
- Add policies for move management

3. Indexes
- Performance indexes for move queries
*/

-- Create moves table
CREATE TABLE IF NOT EXISTS moves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE,
    player_id uuid REFERENCES users (id) ON DELETE CASCADE,
    move_notation text NOT NULL,
    timestamp timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves (game_id);

CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves (timestamp);

-- Enable Row Level Security
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- Create policies for moves table
CREATE POLICY "Users can read moves from their games" ON moves FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = moves.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can insert moves in their games" ON moves FOR
INSERT
    TO authenticated
WITH
    CHECK (
        auth.uid () = player_id
        AND EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = moves.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );