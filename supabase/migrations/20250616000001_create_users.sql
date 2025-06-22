/*
# Create Users Table
Stores player profiles and current state.
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT auth.uid (),
    username text UNIQUE NOT NULL,
    elo integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    draws integer DEFAULT 0 NOT NULL,
    avatar_url text,
    is_online boolean DEFAULT false NOT NULL,
    last_seen_at timestamptz DEFAULT now(),
    last_seen_method text DEFAULT 'offline',
    status text DEFAULT 'active' CHECK (
        status IN ('active', 'suspended')
    ) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo);

CREATE INDEX IF NOT EXISTS idx_users_is_online ON users (is_online);

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users (last_seen_at);

CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own profile" ON users FOR
SELECT TO authenticated USING (auth.uid () = id);

CREATE POLICY "Users can read basic info for matchmaking" ON users FOR
SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON users FOR
UPDATE TO authenticated USING (auth.uid () = id);

CREATE POLICY "Users can insert own profile" ON users FOR
INSERT
    TO authenticated
WITH
    CHECK (auth.uid () = id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user_settings when user is created
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id, sounds_enabled, notifications_enabled, theme, allow_friend_challenges)
    VALUES (NEW.id, true, true, 'system', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_user_settings
    AFTER INSERT ON users 
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();

-- Auto-log player connections/disconnections
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when user comes online/offline
    IF OLD.is_online != NEW.is_online THEN
        PERFORM log_game_event(
            NULL, -- No specific game
            NEW.id,
            CASE WHEN NEW.is_online THEN 'user_online' ELSE 'user_offline' END,
            jsonb_build_object(
                'last_seen_method', NEW.last_seen_method,
                'timestamp', NEW.last_seen_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_user_activity
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- Auto-remove from matchmaking queue when user goes offline
CREATE OR REPLACE FUNCTION cleanup_offline_user_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove from matchmaking queue when user goes offline
    IF OLD.is_online = true AND NEW.is_online = false THEN
        DELETE FROM matchmaking_queue WHERE player_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_offline_user_queue
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_offline_user_queue();

-- Universal user activity tracking function
-- This function can be called from any operation to update user activity
CREATE OR REPLACE FUNCTION track_user_activity(
    p_user_id uuid,
    p_activity_method text DEFAULT 'database_operation',
    p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    -- Update user's online status and last seen
    UPDATE users 
    SET 
        is_online = true,
        last_seen_at = now(),
        last_seen_method = p_activity_method,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Log the activity event (if game_events table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_events') THEN
        PERFORM log_game_event(
            NULL, -- No specific game
            p_user_id,
            'user_activity',
            jsonb_build_object(
                'activity_method', p_activity_method,
                'timestamp', now(),
                'additional_data', p_additional_data
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically track activity on any table operation involving a user
CREATE OR REPLACE FUNCTION auto_track_user_activity()
RETURNS TRIGGER AS $$
DECLARE
    user_id_to_track uuid;
    activity_method text;
    table_name text;
    operation_type text;
BEGIN
    -- Get the table name
    table_name := TG_TABLE_NAME;
    operation_type := TG_OP;
    
    -- Determine the user ID and activity method based on the table and operation
    CASE table_name
        WHEN 'users' THEN
            user_id_to_track := COALESCE(NEW.id, OLD.id);
            activity_method := 'profile_' || lower(operation_type);
            
        WHEN 'user_settings' THEN
            user_id_to_track := COALESCE(NEW.user_id, OLD.user_id);
            activity_method := 'settings_' || lower(operation_type);
            
        WHEN 'wallets' THEN
            user_id_to_track := COALESCE(NEW.user_id, OLD.user_id);
            activity_method := 'wallet_' || lower(operation_type);
            
        WHEN 'matchmaking_queue' THEN
            user_id_to_track := COALESCE(NEW.player_id, OLD.player_id);
            activity_method := 'matchmaking_' || lower(operation_type);
            
        WHEN 'games' THEN
            -- Track activity for both players
            IF NEW IS NOT NULL THEN
                PERFORM track_user_activity(NEW.player1_id, 'game_' || lower(operation_type));
                PERFORM track_user_activity(NEW.player2_id, 'game_' || lower(operation_type));
            ELSIF OLD IS NOT NULL THEN
                PERFORM track_user_activity(OLD.player1_id, 'game_' || lower(operation_type));
                PERFORM track_user_activity(OLD.player2_id, 'game_' || lower(operation_type));
            END IF;
            RETURN COALESCE(NEW, OLD);
            
        WHEN 'game_moves' THEN
            user_id_to_track := COALESCE(NEW.player_id, OLD.player_id);
            activity_method := 'move_' || lower(operation_type);
            
        WHEN 'game_messages' THEN
            user_id_to_track := COALESCE(NEW.sender_id, OLD.sender_id);
            activity_method := 'message_' || lower(operation_type);
            -- Skip system messages (sender_id is NULL)
            IF user_id_to_track IS NULL THEN
                RETURN COALESCE(NEW, OLD);
            END IF;
            
        WHEN 'game_lobby_logs' THEN
            user_id_to_track := COALESCE(NEW.player_id, OLD.player_id);
            activity_method := 'lobby_' || lower(operation_type);
            
        WHEN 'rating_history' THEN
            user_id_to_track := COALESCE(NEW.user_id, OLD.user_id);
            activity_method := 'rating_' || lower(operation_type);
            
        ELSE
            -- For unknown tables, try to find a user-related column
            -- This is a fallback for future tables
            RETURN COALESCE(NEW, OLD);
    END CASE;
    
    -- Track the user activity if we found a user ID
    IF user_id_to_track IS NOT NULL THEN
        PERFORM track_user_activity(
            user_id_to_track, 
            activity_method,
            jsonb_build_object(
                'table', table_name,
                'operation', operation_type,
                'record_id', COALESCE(NEW.id, OLD.id)
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Client-side ping system for tracking read activity and presence
CREATE OR REPLACE FUNCTION ping_user_activity(
    p_user_id uuid,
    p_activity_type text DEFAULT 'browsing',
    p_page_context text DEFAULT NULL,
    p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    -- Update user's online status and last seen (NO EVENT LOGGING)
    UPDATE users 
    SET 
        is_online = true,
        last_seen_at = now(),
        last_seen_method = p_activity_type,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Return current user status
    SELECT jsonb_build_object(
        'user_id', id,
        'is_online', is_online,
        'last_seen_at', last_seen_at,
        'last_seen_method', last_seen_method,
        'ping_received', true,
        'server_time', now()
    ) INTO result
    FROM users 
    WHERE id = p_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to handle user going offline (when pings stop)
CREATE OR REPLACE FUNCTION set_user_offline_after_timeout()
RETURNS void AS $$
BEGIN
    -- Set users offline if they haven't been seen in the last 30 seconds
    -- This should be called by a cron job or scheduled function
    UPDATE users 
    SET 
        is_online = false,
        last_seen_method = 'timeout_offline',
        updated_at = now()
    WHERE 
        is_online = true 
        AND last_seen_at < (now() - interval '30 seconds');
        
    -- Remove offline users from matchmaking queue
    DELETE FROM matchmaking_queue 
    WHERE player_id IN (
        SELECT id FROM users 
        WHERE is_online = false
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get active users count
CREATE OR REPLACE FUNCTION get_active_users_count()
RETURNS integer AS $$
DECLARE
    active_count integer;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM users 
    WHERE 
        is_online = true 
        AND last_seen_at > (now() - interval '1 minute');
    
    RETURN active_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current activity status
CREATE OR REPLACE FUNCTION get_user_activity_status(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    user_status jsonb;
BEGIN
    SELECT jsonb_build_object(
        'user_id', id,
        'username', username,
        'is_online', is_online,
        'last_seen_at', last_seen_at,
        'last_seen_method', last_seen_method,
        'seconds_since_last_seen', EXTRACT(EPOCH FROM (now() - last_seen_at))::integer,
        'activity_status', CASE 
            WHEN is_online AND last_seen_at > (now() - interval '10 seconds') THEN 'active'
            WHEN is_online AND last_seen_at > (now() - interval '1 minute') THEN 'idle'
            ELSE 'offline'
        END
    ) INTO user_status
    FROM users 
    WHERE id = p_user_id;
    
    RETURN user_status;
END;
$$ LANGUAGE plpgsql;