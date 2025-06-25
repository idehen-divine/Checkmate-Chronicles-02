/*
# Create Wallets Table
Stores each user's Algorand wallet info.
*/

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    public_address text UNIQUE NOT NULL,
    private_key text NOT NULL, -- Should be encrypted in application layer
    mnemonic text NOT NULL, -- Should be encrypted in application layer
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);

CREATE INDEX IF NOT EXISTS idx_wallets_public_address ON wallets (public_address);

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Create policies - Very restrictive for wallet data
CREATE POLICY "Users can read own wallet" ON wallets FOR
SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "Users can update own wallet" ON wallets FOR
UPDATE TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own wallet" ON wallets FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete own wallet" ON wallets FOR DELETE TO authenticated USING (auth.uid () = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to track user activity on wallet operations
CREATE TRIGGER trigger_wallets_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();