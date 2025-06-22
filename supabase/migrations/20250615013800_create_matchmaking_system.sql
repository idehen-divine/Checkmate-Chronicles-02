/*
# Create Matchmaking System Tables

1. New Tables
- `game_invitations` - Game invitations between players
- `matchmaking_queue` - Active matchmaking queue
- `match_notifications` - Notifications for match found events

2. Security
- Enable RLS on all tables
- Add policies for secure access

3. Functions
- Auto-cleanup expired invitations
- Matchmaking queue management
*/

-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM (
    'pending',
    'accepted', 
    'declined',
    'expired'
);

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
    'match_found',
    'invitation_received',
    'invitation_accepted',
    'invitation_declined'
);

-- Create game invitations table
CREATE TABLE IF NOT EXISTS game_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    from_user_id uuid REFERENCES users (id) ON DELETE CASCADE,
    to_user_id uuid REFERENCES users (id) ON DELETE CASCADE,
    time_control jsonb NOT NULL,
    status invitation_status NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- Create matchmaking queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES users (id) ON DELETE CASCADE UNIQUE,
    elo_rating integer NOT NULL,
    time_control jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create match notifications table
CREATE TABLE IF NOT EXISTS match_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES users (id) ON DELETE CASCADE,
    game_id uuid REFERENCES games (id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_invitations_from_user ON game_invitations (from_user_id);

CREATE INDEX IF NOT EXISTS idx_game_invitations_to_user ON game_invitations (to_user_id);

CREATE INDEX IF NOT EXISTS idx_game_invitations_status ON game_invitations (status);

CREATE INDEX IF NOT EXISTS idx_game_invitations_expires ON game_invitations (expires_at);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_user ON matchmaking_queue (user_id);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_elo ON matchmaking_queue (elo_rating);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_created ON matchmaking_queue (created_at);

CREATE INDEX IF NOT EXISTS idx_match_notifications_user ON match_notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_match_notifications_type ON match_notifications(type);

CREATE INDEX IF NOT EXISTS idx_match_notifications_read ON match_notifications (read);

-- Enable Row Level Security
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

ALTER TABLE match_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for game_invitations table
CREATE POLICY "Users can read their invitations" ON game_invitations FOR
SELECT TO authenticated USING (
        auth.uid () = from_user_id
        OR auth.uid () = to_user_id
    );

CREATE POLICY "Users can create invitations" ON game_invitations FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = from_user_id);

CREATE POLICY "Users can update their invitations" ON game_invitations FOR
UPDATE TO authenticated USING (
    auth.uid () = from_user_id
    OR auth.uid () = to_user_id
);

CREATE POLICY "Users can delete their sent invitations" ON game_invitations FOR DELETE TO authenticated USING (auth.uid () = from_user_id);

-- Create policies for matchmaking_queue table
CREATE POLICY "Users can read all queue entries for matchmaking" ON matchmaking_queue FOR
SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own queue entry" ON matchmaking_queue FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete their own queue entry" ON matchmaking_queue FOR DELETE TO authenticated USING (auth.uid () = user_id);

-- Create policies for match_notifications table
CREATE POLICY "Users can read their notifications" ON match_notifications FOR
SELECT TO authenticated USING (auth.uid () = user_id);

CREATE POLICY "Users can update their notifications" ON match_notifications FOR
UPDATE TO authenticated USING (auth.uid () = user_id);

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE game_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < now();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run expiration check
CREATE TRIGGER trigger_expire_invitations
    AFTER INSERT OR UPDATE ON game_invitations
    FOR EACH STATEMENT
    EXECUTE FUNCTION expire_old_invitations();

-- Function to clean up old matchmaking queue entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM matchmaking_queue 
    WHERE created_at < now() - interval '1 hour';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for queue cleanup
CREATE TRIGGER trigger_cleanup_queue
    AFTER INSERT ON matchmaking_queue
    FOR EACH STATEMENT
    EXECUTE FUNCTION cleanup_old_queue_entries();

-- Function to prevent duplicate active invitations
CREATE OR REPLACE FUNCTION prevent_duplicate_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there's already a pending invitation between these users
    IF EXISTS (
        SELECT 1 FROM game_invitations 
        WHERE ((from_user_id = NEW.from_user_id AND to_user_id = NEW.to_user_id) 
            OR (from_user_id = NEW.to_user_id AND to_user_id = NEW.from_user_id))
        AND status = 'pending'
        AND expires_at > now()
    ) THEN
        RAISE EXCEPTION 'Active invitation already exists between these users';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate invitations
CREATE TRIGGER trigger_prevent_duplicate_invitations
    BEFORE INSERT ON game_invitations
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_invitations();

-- Function to remove user from matchmaking queue when they get a game
CREATE OR REPLACE FUNCTION remove_from_queue_on_game_start()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove both players from matchmaking queue when a game starts
    DELETE FROM matchmaking_queue 
    WHERE user_id IN (NEW.player1_id, NEW.player2_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to remove from queue on game creation
CREATE TRIGGER trigger_remove_from_queue
    AFTER INSERT ON games
    FOR EACH ROW
    EXECUTE FUNCTION remove_from_queue_on_game_start();

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add is_online column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_online') THEN
        ALTER TABLE users ADD COLUMN is_online boolean DEFAULT false;
    END IF;
    
    -- Add last_seen column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_seen') THEN
        ALTER TABLE users ADD COLUMN last_seen timestamptz DEFAULT now();
    END IF;
END $$;

-- Create index for online users
CREATE INDEX IF NOT EXISTS idx_users_online ON users (is_online)
WHERE
    is_online = true;

-- Function to automatically set users offline after 5 minutes of inactivity
CREATE OR REPLACE FUNCTION update_user_online_status()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET is_online = false 
    WHERE is_online = true 
    AND last_seen < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create a function to find matchmaking opponents
CREATE OR REPLACE FUNCTION find_matchmaking_opponent(
    p_user_id uuid,
    p_elo_rating integer,
    p_time_control jsonb,
    p_max_elo_diff integer DEFAULT 200
)
RETURNS uuid AS $$
DECLARE
    opponent_id uuid;
BEGIN
    -- Find the best opponent within ELO range
    SELECT user_id INTO opponent_id
    FROM matchmaking_queue
    WHERE user_id != p_user_id
    AND time_control = p_time_control
    AND ABS(elo_rating - p_elo_rating) <= p_max_elo_diff
    ORDER BY 
        ABS(elo_rating - p_elo_rating) ASC,
        created_at ASC
    LIMIT 1;
    
    RETURN opponent_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;