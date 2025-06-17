export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    username: string;
                    created_at: string;
                    algorand_wallet_address?: string;
                    algorand_private_key?: string;
                    algorand_secret_phrase?: string;
                    sounds_enabled?: boolean;
                    hints_enabled?: boolean;
                    legal_moves_enabled?: boolean;
                    game_invites_enabled?: boolean;
                    nft_mints_enabled?: boolean;
                    announcements_enabled?: boolean;
                };
                Insert: {
                    id?: string;
                    email: string;
                    username: string;
                    created_at?: string;
                    algorand_wallet_address?: string;
                    algorand_private_key?: string;
                    algorand_secret_phrase?: string;
                    sounds_enabled?: boolean;
                    hints_enabled?: boolean;
                    legal_moves_enabled?: boolean;
                    game_invites_enabled?: boolean;
                    nft_mints_enabled?: boolean;
                    announcements_enabled?: boolean;
                };
                Update: {
                    id?: string;
                    email?: string;
                    username?: string;
                    created_at?: string;
                    algorand_wallet_address?: string;
                    algorand_private_key?: string;
                    algorand_secret_phrase?: string;
                    sounds_enabled?: boolean;
                    hints_enabled?: boolean;
                    legal_moves_enabled?: boolean;
                    game_invites_enabled?: boolean;
                    nft_mints_enabled?: boolean;
                    announcements_enabled?: boolean;
                };
            };
            games: {
                Row: {
                    id: string;
                    player1_id: string;
                    player2_id: string;
                    game_state: any;
                    status: string;
                    created_at: string;
                    finished_at?: string;
                };
                Insert: {
                    id?: string;
                    player1_id: string;
                    player2_id: string;
                    game_state: any;
                    status: string;
                    created_at?: string;
                    finished_at?: string;
                };
                Update: {
                    id?: string;
                    player1_id?: string;
                    player2_id?: string;
                    game_state?: any;
                    status?: string;
                    created_at?: string;
                    finished_at?: string;
                };
            };
            moves: {
                Row: {
                    id: string;
                    game_id: string;
                    player_id: string;
                    move_notation: string;
                    timestamp: string;
                };
                Insert: {
                    id?: string;
                    game_id: string;
                    player_id: string;
                    move_notation: string;
                    timestamp?: string;
                };
                Update: {
                    id?: string;
                    game_id?: string;
                    player_id?: string;
                    move_notation?: string;
                    timestamp?: string;
                };
            };
            chat: {
                Row: {
                    id: string;
                    game_id: string;
                };
                Insert: {
                    id?: string;
                    game_id: string;
                };
                Update: {
                    id?: string;
                    game_id?: string;
                };
            };
            message: {
                Row: {
                    id: string;
                    user_id: string;
                    text: string;
                    timestamp: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    text: string;
                    timestamp?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    text?: string;
                    timestamp?: string;
                };
            };
            nft_checkmates: {
                Row: {
                    id: string;
                    game_id: string;
                    winner_id: string;
                    metadata: any;
                    minted_at: string;
                    algorand_asset_id?: string;
                };
                Insert: {
                    id?: string;
                    game_id: string;
                    winner_id: string;
                    metadata: any;
                    minted_at?: string;
                    algorand_asset_id?: string;
                };
                Update: {
                    id?: string;
                    game_id?: string;
                    winner_id?: string;
                    metadata?: any;
                    minted_at?: string;
                    algorand_asset_id?: string;
                };
            };
        };
    };
}