/*
# Create User Settings Table
Stores personal user preferences.
*/

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    sounds_enabled boolean DEFAULT true NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    theme text DEFAULT 'system' CHECK (
        theme IN ('light', 'dark', 'system')
    ) NOT NULL,
    allow_friend_challenges boolean DEFAULT true NOT NULL,
    custom_data jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own settings" ON user_settings FOR
SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "Users can update own settings" ON user_settings FOR
UPDATE TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE TO authenticated USING (auth.uid () = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to track user activity on settings changes
CREATE TRIGGER trigger_user_settings_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();