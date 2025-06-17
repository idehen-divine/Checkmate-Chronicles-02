/*
  # Create Database Indexes
  
  1. Performance Indexes
    - Indexes for games table
    - Indexes for moves table
    - Indexes for message table
    - Indexes for nft_checkmates table
*/

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_timestamp ON moves(timestamp);
CREATE INDEX IF NOT EXISTS idx_message_chat_id ON message(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_timestamp ON message(timestamp);
CREATE INDEX IF NOT EXISTS idx_nft_checkmates_winner ON nft_checkmates(winner_id); 