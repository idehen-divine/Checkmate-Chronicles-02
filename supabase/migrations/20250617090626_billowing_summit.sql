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
DO $$
BEGIN
  -- Game Preferences
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sounds_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN sounds_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'hints_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN hints_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'legal_moves_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN legal_moves_enabled boolean DEFAULT true;
  END IF;

  -- Notification Preferences
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'game_invites_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN game_invites_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'nft_mints_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN nft_mints_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'announcements_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN announcements_enabled boolean DEFAULT true;
  END IF;
END $$;