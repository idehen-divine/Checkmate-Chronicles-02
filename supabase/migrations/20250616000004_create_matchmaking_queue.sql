/*
# Create Matchmaking Queue Table
Handles finding and pairing players.
*/

-- Create matchmaking_queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    player_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    game_type text NOT NULL CHECK (
        game_type IN (
            'bullet',
            'blitz',
            'rapid',
            'classical'
        )
    ),
    status text DEFAULT 'waiting' CHECK (
        status IN (
            'waiting',
            'matching',
            'matched',
            'lobby'
        )
    ) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (player_id) -- One queue entry per player
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_player_id ON matchmaking_queue (player_id);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game_type ON matchmaking_queue (game_type);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_status ON matchmaking_queue (status);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_created_at ON matchmaking_queue (created_at);

-- Enable Row Level Security
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read all queue entries" ON matchmaking_queue FOR
SELECT TO authenticated USING (true);
-- Allow reading all entries for matchmaking

CREATE POLICY "Users can manage own queue entry" ON matchmaking_queue FOR ALL TO authenticated USING (auth.uid () = player_id)
WITH
    CHECK (auth.uid () = player_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_matchmaking_queue_updated_at
    BEFORE UPDATE ON matchmaking_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to track user activity on matchmaking operations
CREATE TRIGGER trigger_matchmaking_queue_activity_tracking
    AFTER INSERT OR UPDATE OR DELETE ON matchmaking_queue
    FOR EACH ROW
    EXECUTE FUNCTION auto_track_user_activity();

-- Function to clean up old queue entries (older than 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS void AS $$
BEGIN
    DELETE FROM matchmaking_queue 
    WHERE created_at < now() - interval '30 minutes'
    AND status = 'waiting';
END;
$$ LANGUAGE plpgsql;

-- Create a function to be called periodically to clean up old entries
-- This can be called by a cron job or application logic