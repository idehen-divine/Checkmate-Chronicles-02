/*
# Add User Preferences to Users Table

1. New Columns
- `sounds_enabled` (boolean) - Controls game sound effects
- `hints_enabled` (boolean) - Controls move hints display
- `legal_moves_enabled` (boolean) - Controls legal moves highlighting
- `game_invites_enabled` (boolean) - Controls game invitation notifications
- `nft_mints_enabled` (boolean) - Controls NFT minting notifications
- `announcements_enabled` (boolean) - Controls announcement notifications

2. Default Values
- All preferences default to true for better user experience
- Users can opt-out rather than opt-in
*/

-- Add user preference columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sounds_enabled boolean DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS hints_enabled boolean DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS legal_moves_enabled boolean DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS game_invites_enabled boolean DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS nft_mints_enabled boolean DEFAULT true;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS announcements_enabled boolean DEFAULT true;