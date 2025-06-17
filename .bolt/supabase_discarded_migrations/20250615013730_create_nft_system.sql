/*
# Create NFT System Tables

1. New Tables
- `nft_checkmates` - NFT metadata for checkmate moments

2. Security
- Enable RLS on nft_checkmates table
- Add policies for NFT management
*/

-- Create nft_checkmates table
CREATE TABLE IF NOT EXISTS nft_checkmates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE,
    winner_id uuid REFERENCES users (id) ON DELETE CASCADE,
    metadata jsonb NOT NULL DEFAULT '{}',
    minted_at timestamptz DEFAULT now(),
    algorand_asset_id text
);

-- Enable Row Level Security
ALTER TABLE nft_checkmates ENABLE ROW LEVEL SECURITY;

-- Create policies for nft_checkmates table
CREATE POLICY "Users can read their NFTs" ON nft_checkmates FOR
SELECT TO authenticated USING (auth.uid () = winner_id);

CREATE POLICY "Users can create NFTs for their wins" ON nft_checkmates FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = winner_id);