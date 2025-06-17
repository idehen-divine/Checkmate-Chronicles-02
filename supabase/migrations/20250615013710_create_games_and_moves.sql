/*
# Create Games and Moves Tables

1. New Tables
- `games` - Chess game records and state
- `moves` - Individual chess moves history

2. Security
- Enable RLS on both tables
- Add policies for game and move management
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    player1_id uuid REFERENCES users (id) ON DELETE CASCADE,
    player2_id uuid REFERENCES users (id) ON DELETE CASCADE,
    game_state jsonb NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    finished_at timestamptz
);

-- Create moves table
CREATE TABLE IF NOT EXISTS moves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE,
    player_id uuid REFERENCES users (id) ON DELETE CASCADE,
    move_notation text NOT NULL,
    timestamp timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

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