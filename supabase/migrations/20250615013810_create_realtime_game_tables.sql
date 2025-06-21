/*
# Create Real-time Game Support Tables

1. New Tables
- `player_connections` - Track player connection status
- `game_actions` - Game actions like draw offers, resignations
- Enhanced `moves` table with additional fields

2. Security
- Enable RLS on all tables
- Add policies for secure access
*/

-- Create game action types enum
CREATE TYPE game_action_type AS ENUM (
    'draw_offer',
    'draw_accept',
    'draw_decline',
    'resignation',
    'timeout_claim',
    'pause_request',
    'resume_request'
);

-- Create player connections table
CREATE TABLE IF NOT EXISTS player_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE,
    user_id uuid REFERENCES users (id) ON DELETE CASCADE,
    is_connected boolean DEFAULT true,
    last_seen timestamptz DEFAULT now(),
    reconnection_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE (game_id, user_id)
);

-- Create game actions table
CREATE TABLE IF NOT EXISTS game_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    game_id uuid REFERENCES games (id) ON DELETE CASCADE,
    player_id uuid REFERENCES users (id) ON DELETE CASCADE,
    action_type game_action_type NOT NULL,
    action_data jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Add additional columns to moves table if they don't exist
DO $$ 
BEGIN
    -- Add from_square column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moves' AND column_name = 'from_square') THEN
        ALTER TABLE moves ADD COLUMN from_square varchar(2);
    END IF;
    
    -- Add to_square column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moves' AND column_name = 'to_square') THEN
        ALTER TABLE moves ADD COLUMN to_square varchar(2);
    END IF;
    
    -- Add fen_after column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moves' AND column_name = 'fen_after') THEN
        ALTER TABLE moves ADD COLUMN fen_after text;
    END IF;
    
    -- Add time_left column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moves' AND column_name = 'time_left') THEN
        ALTER TABLE moves ADD COLUMN time_left integer;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_connections_game ON player_connections (game_id);

CREATE INDEX IF NOT EXISTS idx_player_connections_user ON player_connections (user_id);

CREATE INDEX IF NOT EXISTS idx_player_connections_connected ON player_connections (is_connected);

CREATE INDEX IF NOT EXISTS idx_player_connections_last_seen ON player_connections (last_seen);

CREATE INDEX IF NOT EXISTS idx_game_actions_game ON game_actions (game_id);

CREATE INDEX IF NOT EXISTS idx_game_actions_player ON game_actions (player_id);

CREATE INDEX IF NOT EXISTS idx_game_actions_type ON game_actions (action_type);

CREATE INDEX IF NOT EXISTS idx_game_actions_created ON game_actions (created_at);

CREATE INDEX IF NOT EXISTS idx_moves_from_square ON moves (from_square);

CREATE INDEX IF NOT EXISTS idx_moves_to_square ON moves (to_square);

-- Enable Row Level Security
ALTER TABLE player_connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for player_connections table
CREATE POLICY "Players can read connections for their games" ON player_connections FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = player_connections.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can update their own connection" ON player_connections FOR
INSERT
    TO authenticated
WITH
    CHECK (
        auth.uid () = user_id
        AND EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = player_connections.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can modify their own connection" ON player_connections FOR
UPDATE TO authenticated USING (auth.uid () = user_id);

-- Create policies for game_actions table
CREATE POLICY "Players can read actions for their games" ON game_actions FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_actions.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

CREATE POLICY "Players can create actions for their games" ON game_actions FOR
INSERT
    TO authenticated
WITH
    CHECK (
        auth.uid () = player_id
        AND EXISTS (
            SELECT 1
            FROM games
            WHERE
                games.id = game_actions.game_id
                AND (
                    games.player1_id = auth.uid ()
                    OR games.player2_id = auth.uid ()
                )
        )
    );

-- Function to automatically mark players as disconnected after inactivity
CREATE OR REPLACE FUNCTION mark_inactive_players_disconnected()
RETURNS void AS $$
BEGIN
    UPDATE player_connections 
    SET is_connected = false 
    WHERE is_connected = true 
    AND last_seen < now() - interval '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to handle player reconnection
CREATE OR REPLACE FUNCTION handle_player_reconnection()
RETURNS TRIGGER AS $$
BEGIN
    -- If player was disconnected and is now connecting, increment reconnection count
    IF OLD.is_connected = false AND NEW.is_connected = true THEN
        NEW.reconnection_count = OLD.reconnection_count + 1;
    END IF;
    
    -- Update last_seen timestamp
    NEW.last_seen = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reconnection handling
CREATE TRIGGER trigger_handle_reconnection
    BEFORE UPDATE ON player_connections
    FOR EACH ROW
    EXECUTE FUNCTION handle_player_reconnection();

-- Function to pause game when a player disconnects
CREATE OR REPLACE FUNCTION handle_player_disconnection()
RETURNS TRIGGER AS $$
BEGIN
    -- If a player just disconnected in an active game, consider pausing
    IF OLD.is_connected = true AND NEW.is_connected = false THEN
        -- Check if game is active
        IF EXISTS (
            SELECT 1 FROM games 
            WHERE id = NEW.game_id 
            AND status = 'active'
        ) THEN
            -- Log the disconnection
            INSERT INTO game_actions (game_id, player_id, action_type, action_data)
            VALUES (
                NEW.game_id, 
                NEW.user_id, 
                'pause_request', 
                jsonb_build_object('reason', 'player_disconnected', 'auto_generated', true)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for disconnection handling
CREATE TRIGGER trigger_handle_disconnection
    AFTER UPDATE ON player_connections
    FOR EACH ROW
    EXECUTE FUNCTION handle_player_disconnection();

-- Function to clean up old connection records
CREATE OR REPLACE FUNCTION cleanup_old_connections()
RETURNS void AS $$
BEGIN
    DELETE FROM player_connections 
    WHERE last_seen < now() - interval '24 hours'
    AND is_connected = false;
END;
$$ LANGUAGE plpgsql;

-- Function to get active games for a user
CREATE OR REPLACE FUNCTION get_user_active_games(p_user_id uuid)
RETURNS TABLE (
    game_id uuid,
    opponent_id uuid,
    opponent_username text,
    player_color text,
    game_status text,
    is_player_turn boolean,
    last_move_time timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as game_id,
        CASE 
            WHEN g.player1_id = p_user_id THEN g.player2_id 
            ELSE g.player1_id 
        END as opponent_id,
        CASE 
            WHEN g.player1_id = p_user_id THEN p2.username 
            ELSE p1.username 
        END as opponent_username,
        CASE 
            WHEN g.player1_id = p_user_id THEN 'white' 
            ELSE 'black' 
        END as player_color,
        g.status::text as game_status,
        CASE 
            WHEN g.player1_id = p_user_id THEN (g.game_state->>'current_turn') = 'white'
            ELSE (g.game_state->>'current_turn') = 'black'
        END as is_player_turn,
        COALESCE(
            (g.game_state->>'last_move_time')::timestamptz,
            g.started_at,
            g.created_at
        ) as last_move_time
    FROM games g
    JOIN users p1 ON g.player1_id = p1.id
    JOIN users p2 ON g.player2_id = p2.id
    WHERE (g.player1_id = p_user_id OR g.player2_id = p_user_id)
    AND g.status IN ('not_started', 'active', 'paused')
    ORDER BY last_move_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;