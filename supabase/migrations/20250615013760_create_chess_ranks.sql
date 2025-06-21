/*
# Create Chess Ranks System

1. New Tables
- `chess_ranks` - Defines all chess rank tiers with ELO ranges

2. Initial Data
- Populate with online platform ranking system (6 tiers)

3. Security
- Enable RLS with public read access for rank information
*/

-- Create chess ranks table
CREATE TABLE IF NOT EXISTS chess_ranks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    name text NOT NULL UNIQUE,
    display_name text NOT NULL,
    min_elo integer NOT NULL,
    max_elo integer,
    color_code text DEFAULT '#666666',
    rank_order integer NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE chess_ranks ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to ranks
CREATE POLICY "Anyone can read chess ranks" ON chess_ranks FOR
SELECT TO authenticated, anon USING (true);

-- Insert online platform chess ranks (ordered from lowest to highest)
INSERT INTO
    chess_ranks (
        name,
        display_name,
        min_elo,
        max_elo,
        color_code,
        rank_order
    )
VALUES (
        'beginner',
        'Beginner',
        0,
        800,
        '#8B4513',
        1
    ),
    (
        'novice',
        'Novice',
        800,
        1200,
        '#CD853F',
        2
    ),
    (
        'intermediate',
        'Intermediate',
        1200,
        1600,
        '#DAA520',
        3
    ),
    (
        'advanced',
        'Advanced',
        1600,
        2000,
        '#FF8C00',
        4
    ),
    (
        'expert',
        'Expert',
        2000,
        2200,
        '#C0C0C0',
        5
    ),
    (
        'master',
        'Master',
        2200,
        NULL,
        '#FFD700',
        6
    );

-- Create index for efficient ELO range queries
CREATE INDEX idx_chess_ranks_elo_range ON chess_ranks (min_elo, max_elo);

CREATE INDEX idx_chess_ranks_order ON chess_ranks (rank_order);