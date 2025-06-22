/*
# Create Game Messages Table
Handles in-game chat and system messages.
*/

-- Create game_messages table
CREATE TABLE IF NOT EXISTS game_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES users (id) ON DELETE CASCADE, -- Nullable for system messages
    message text NOT NULL,
    type text DEFAULT 'text' CHECK (
        type IN (
            'text',
            'system',
            'emote',
            'draw_offer',
            'draw_accept',
            'draw_decline'
        )
    ) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_game_messages_game_id ON game_messages (game_id);

CREATE INDEX IF NOT EXISTS idx_game_messages_sender_id ON game_messages (sender_id);

CREATE INDEX IF NOT EXISTS idx_game_messages_type ON game_messages (type);

CREATE INDEX IF NOT EXISTS idx_game_messages_created_at ON game_messages (created_at);

-- Create composite index for game messages in chronological order
CREATE INDEX IF NOT EXISTS idx_game_messages_game_created ON game_messages (game_id, created_at);

-- Enable Row Level Security
ALTER TABLE game_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read messages from their games" ON game_messages FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_messages.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can send messages in their games" ON game_messages FOR
INSERT
    TO authenticated
WITH
    CHECK (
        (
            auth.uid () = sender_id
            OR sender_id IS NULL
        )
        AND -- Allow system messages
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_messages.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

-- Function to create system messages
CREATE OR REPLACE FUNCTION create_system_message(
    p_game_id uuid,
    p_message text,
    p_type text DEFAULT 'system'
)
RETURNS uuid AS $$
DECLARE
    message_id uuid;
BEGIN
    INSERT INTO game_messages (game_id, sender_id, message, type)
    VALUES (p_game_id, NULL, p_message, p_type)
    RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle draw offers through messages
CREATE OR REPLACE FUNCTION handle_draw_offer()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a draw offer, create a system message
    IF NEW.type = 'draw_offer' THEN
        PERFORM create_system_message(
            NEW.game_id,
            (SELECT username FROM users WHERE id = NEW.sender_id) || ' offered a draw',
            'system'
        );
    ELSIF NEW.type = 'draw_accept' THEN
        PERFORM create_system_message(
            NEW.game_id,
            (SELECT username FROM users WHERE id = NEW.sender_id) || ' accepted the draw',
            'system'
        );
    ELSIF NEW.type = 'draw_decline' THEN
        PERFORM create_system_message(
            NEW.game_id,
            (SELECT username FROM users WHERE id = NEW.sender_id) || ' declined the draw',
            'system'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for draw offer handling
CREATE TRIGGER trigger_handle_draw_offer
    AFTER INSERT ON game_messages
    FOR EACH ROW
    WHEN (NEW.type IN ('draw_offer', 'draw_accept', 'draw_decline'))
    EXECUTE FUNCTION handle_draw_offer();

-- Auto-update user's last_seen when they send a message
CREATE OR REPLACE FUNCTION update_player_activity_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for non-system messages
    IF NEW.sender_id IS NOT NULL THEN
        UPDATE users 
        SET 
            last_seen_at = NEW.created_at,
            last_seen_method = 'sending_message',
            is_online = true
        WHERE id = NEW.sender_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_activity_on_message
    AFTER INSERT ON game_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_player_activity_on_message();

-- Create trigger to track user activity on message operations
CREATE TRIGGER trigger_game_messages_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON game_messages
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Create trigger to track user activity when messages are sent
CREATE TRIGGER trigger_track_message_activity
    AFTER INSERT OR UPDATE OR DELETE ON game_messages
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- OPTIMIZATION: Add retention policy and cleanup functions
-- 1. Cleanup old game messages (1-month retention)
CREATE OR REPLACE FUNCTION cleanup_old_game_messages()
RETURNS void AS $$
BEGIN
    -- Delete messages older than 1 month for finished games
    DELETE FROM game_messages 
    WHERE created_at < NOW() - INTERVAL '1 month'
    AND game_id IN (
        SELECT id FROM games 
        WHERE status = 'finished' 
        AND updated_at < NOW() - INTERVAL '1 week'
    );
    
    -- For active games, keep messages for last 7 days only
    DELETE FROM game_messages 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND game_id IN (
        SELECT id FROM games WHERE status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger wrapper function for cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_old_game_messages()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM cleanup_old_game_messages();
    RETURN NULL; -- For AFTER triggers, return value is ignored
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically cleanup old data on interactions
CREATE TRIGGER trigger_auto_cleanup_messages
    AFTER INSERT ON game_messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_game_messages();

-- 2. Get game messages statistics
CREATE OR REPLACE FUNCTION get_game_messages_stats()
RETURNS TABLE (
    total_messages bigint,
    messages_last_week bigint,
    messages_last_month bigint,
    active_game_messages bigint,
    finished_game_messages bigint,
    system_messages bigint,
    user_messages bigint,
    oldest_message timestamptz,
    newest_message timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 week') as messages_last_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 month') as messages_last_month,
        COUNT(*) FILTER (WHERE game_id IN (SELECT id FROM games WHERE status = 'active')) as active_game_messages,
        COUNT(*) FILTER (WHERE game_id IN (SELECT id FROM games WHERE status = 'finished')) as finished_game_messages,
        COUNT(*) FILTER (WHERE sender_id IS NULL) as system_messages,
        COUNT(*) FILTER (WHERE sender_id IS NOT NULL) as user_messages,
        MIN(created_at) as oldest_message,
        MAX(created_at) as newest_message
    FROM game_messages;
END;
$$ LANGUAGE plpgsql;