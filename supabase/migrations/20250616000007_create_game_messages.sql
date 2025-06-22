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