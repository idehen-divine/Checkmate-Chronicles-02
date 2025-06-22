/*
# Create Admins Table
Manages admin roles and permissions.
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    level text NOT NULL CHECK (
        level IN (
            'super_admin',
            'moderator',
            'support'
        )
    ),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT unique_admin_user UNIQUE (user_id)
);

-- Create indexes for admins
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins (user_id);

CREATE INDEX IF NOT EXISTS idx_admins_level ON admins (level);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for admins
CREATE POLICY "Super admins can manage all admin records" ON admins FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM admins a
        WHERE
            a.user_id = auth.uid ()
            AND a.level = 'super_admin'
    )
);

CREATE POLICY "Users can read their own admin status" ON admins FOR
SELECT TO authenticated USING (user_id = auth.uid ());

-- Create trigger for updated_at
CREATE TRIGGER trigger_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id uuid, p_required_level text DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
    user_admin_level text;
BEGIN
    SELECT level INTO user_admin_level 
    FROM admins 
    WHERE user_id = p_user_id;
    
    IF user_admin_level IS NULL THEN
        RETURN false;
    END IF;
    
    -- If no specific level required, any admin level is sufficient
    IF p_required_level IS NULL THEN
        RETURN true;
    END IF;
    
    -- Check specific admin level hierarchy
    CASE p_required_level
        WHEN 'support' THEN
            RETURN user_admin_level IN ('support', 'moderator', 'super_admin');
        WHEN 'moderator' THEN
            RETURN user_admin_level IN ('moderator', 'super_admin');
        WHEN 'super_admin' THEN
            RETURN user_admin_level = 'super_admin';
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to suspend/unsuspend users (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_status(
    p_admin_user_id uuid,
    p_target_user_id uuid,
    p_new_status text
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    -- Check if the requesting user is an admin
    IF NOT is_user_admin(p_admin_user_id, 'moderator') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient permissions - moderator level required'
        );
    END IF;
    
    -- Validate status
    IF p_new_status NOT IN ('active', 'suspended') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid status - must be active or suspended'
        );
    END IF;
    
    -- Update user status
    UPDATE users 
    SET 
        status = p_new_status,
        updated_at = now()
    WHERE id = p_target_user_id;
    
    -- If suspending user, remove from matchmaking queue
    IF p_new_status = 'suspended' THEN
        DELETE FROM matchmaking_queue WHERE player_id = p_target_user_id;
    END IF;
    
    -- Log the admin action
    PERFORM log_game_event(
        NULL,
        p_admin_user_id,
        'admin_action',
        jsonb_build_object(
            'action', 'update_user_status',
            'target_user_id', p_target_user_id,
            'new_status', p_new_status,
            'timestamp', now()
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User status updated successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Add activity tracking trigger
CREATE TRIGGER trigger_admins_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();