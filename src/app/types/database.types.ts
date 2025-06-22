export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    username: string;
                    elo: number;
                    wins: number;
                    losses: number;
                    draws: number;
                    avatar_url: string | null;
                    is_online: boolean;
                    last_seen_at: string | null;
                    last_seen_method: string;
                    status: 'active' | 'suspended';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    username: string;
                    elo?: number;
                    wins?: number;
                    losses?: number;
                    draws?: number;
                    avatar_url?: string | null;
                    is_online?: boolean;
                    last_seen_at?: string | null;
                    last_seen_method?: string;
                    status?: 'active' | 'suspended';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    username?: string;
                    elo?: number;
                    wins?: number;
                    losses?: number;
                    draws?: number;
                    avatar_url?: string | null;
                    is_online?: boolean;
                    last_seen_at?: string | null;
                    last_seen_method?: string;
                    status?: 'active' | 'suspended';
                    created_at?: string;
                    updated_at?: string;
                };
            };
            user_settings: {
                Row: {
                    id: string;
                    user_id: string;
                    sounds_enabled: boolean;
                    notifications_enabled: boolean;
                    theme: 'light' | 'dark' | 'system';
                    allow_friend_challenges: boolean;
                    custom_data: any;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    sounds_enabled?: boolean;
                    notifications_enabled?: boolean;
                    theme?: 'light' | 'dark' | 'system';
                    allow_friend_challenges?: boolean;
                    custom_data?: any;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    sounds_enabled?: boolean;
                    notifications_enabled?: boolean;
                    theme?: 'light' | 'dark' | 'system';
                    allow_friend_challenges?: boolean;
                    custom_data?: any;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            wallets: {
                Row: {
                    id: string;
                    user_id: string;
                    public_address: string;
                    private_key: string;
                    mnemonic: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    public_address: string;
                    private_key: string;
                    mnemonic: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    public_address?: string;
                    private_key?: string;
                    mnemonic?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            matchmaking_queue: {
                Row: {
                    id: string;
                    player_id: string;
                    game_type: 'bullet' | 'blitz' | 'rapid' | 'classical';
                    status: 'waiting' | 'matching' | 'matched' | 'lobby';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    player_id: string;
                    game_type: 'bullet' | 'blitz' | 'rapid' | 'classical';
                    status?: 'waiting' | 'matching' | 'matched' | 'lobby';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    player_id?: string;
                    game_type?: 'bullet' | 'blitz' | 'rapid' | 'classical';
                    status?: 'waiting' | 'matching' | 'matched' | 'lobby';
                    created_at?: string;
                    updated_at?: string;
                };
            };
            games: {
                Row: {
                    id: string;
                    player1_id: string;
                    player2_id: string;
                    status: 'waiting' | 'active' | 'finished';
                    winner_id: string | null;
                    result: 'win' | 'loss' | 'draw' | 'timeout' | 'resign' | 'abort' | null;
                    meta: any;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    player1_id: string;
                    player2_id: string;
                    status?: 'waiting' | 'active' | 'finished';
                    winner_id?: string | null;
                    result?: 'win' | 'loss' | 'draw' | 'timeout' | 'resign' | 'abort' | null;
                    meta?: any;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    player1_id?: string;
                    player2_id?: string;
                    status?: 'waiting' | 'active' | 'finished';
                    winner_id?: string | null;
                    result?: 'win' | 'loss' | 'draw' | 'timeout' | 'resign' | 'abort' | null;
                    meta?: any;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            game_moves: {
                Row: {
                    id: string;
                    game_id: string;
                    player_id: string;
                    move: string;
                    move_number: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    game_id: string;
                    player_id: string;
                    move: string;
                    move_number: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    game_id?: string;
                    player_id?: string;
                    move?: string;
                    move_number?: number;
                    created_at?: string;
                };
            };
            game_messages: {
                Row: {
                    id: string;
                    game_id: string;
                    sender_id: string | null;
                    message: string;
                    type: 'text' | 'system' | 'emote' | 'draw_offer' | 'draw_accept' | 'draw_decline';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    game_id: string;
                    sender_id?: string | null;
                    message: string;
                    type?: 'text' | 'system' | 'emote' | 'draw_offer' | 'draw_accept' | 'draw_decline';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    game_id?: string;
                    sender_id?: string | null;
                    message?: string;
                    type?: 'text' | 'system' | 'emote' | 'draw_offer' | 'draw_accept' | 'draw_decline';
                    created_at?: string;
                };
            };
            game_events: {
                Row: {
                    id: string;
                    game_id: string;
                    player_id: string | null;
                    type: 'resign' | 'timeout' | 'disconnect' | 'reconnect' | 'draw_offer' | 'draw_accept' | 'draw_decline' | 'pause_request' | 'resume_request' | 'abort_request' | 'game_start' | 'game_end' | 'move_made';
                    details: any;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    game_id: string;
                    player_id?: string | null;
                    type: 'resign' | 'timeout' | 'disconnect' | 'reconnect' | 'draw_offer' | 'draw_accept' | 'draw_decline' | 'pause_request' | 'resume_request' | 'abort_request' | 'game_start' | 'game_end' | 'move_made';
                    details?: any;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    game_id?: string;
                    player_id?: string | null;
                    type?: 'resign' | 'timeout' | 'disconnect' | 'reconnect' | 'draw_offer' | 'draw_accept' | 'draw_decline' | 'pause_request' | 'resume_request' | 'abort_request' | 'game_start' | 'game_end' | 'move_made';
                    details?: any;
                    created_at?: string;
                };
            };
            game_lobby_logs: {
                Row: {
                    id: string;
                    game_id: string;
                    player_id: string;
                    event: 'entered_lobby' | 'left_lobby' | 'ready' | 'not_ready' | 'timeout' | 'kicked' | 'connection_lost' | 'reconnected';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    game_id: string;
                    player_id: string;
                    event: 'entered_lobby' | 'left_lobby' | 'ready' | 'not_ready' | 'timeout' | 'kicked' | 'connection_lost' | 'reconnected';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    game_id?: string;
                    player_id?: string;
                    event?: 'entered_lobby' | 'left_lobby' | 'ready' | 'not_ready' | 'timeout' | 'kicked' | 'connection_lost' | 'reconnected';
                    created_at?: string;
                };
            };
            rating_history: {
                Row: {
                    id: string;
                    user_id: string;
                    game_id: string;
                    old_elo: number;
                    new_elo: number;
                    change: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    game_id: string;
                    old_elo: number;
                    new_elo: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    game_id?: string;
                    old_elo?: number;
                    new_elo?: number;
                    created_at?: string;
                };
            };
            game_ranking: {
                Row: {
                    id: string;
                    name: string;
                    min_elo: number;
                    max_elo: number | null;
                    description: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    min_elo: number;
                    max_elo?: number | null;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    min_elo?: number;
                    max_elo?: number | null;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            admins: {
                Row: {
                    id: string;
                    user_id: string;
                    level: 'super_admin' | 'moderator' | 'support';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    level: 'super_admin' | 'moderator' | 'support';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    level?: 'super_admin' | 'moderator' | 'support';
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Functions: {
            cleanup_old_queue_entries: {
                Args: {};
                Returns: void;
            };
            log_game_event: {
                Args: {
                    p_game_id: string;
                    p_player_id: string;
                    p_type: string;
                    p_details?: any;
                };
                Returns: string;
            };
            log_lobby_event: {
                Args: {
                    p_game_id: string;
                    p_player_id: string;
                    p_event: string;
                };
                Returns: string;
            };
            create_system_message: {
                Args: {
                    p_game_id: string;
                    p_message: string;
                    p_type?: string;
                };
                Returns: string;
            };
            get_user_rating_progress: {
                Args: {
                    p_user_id: string;
                    p_limit?: number;
                };
                Returns: {
                    game_id: string;
                    old_elo: number;
                    new_elo: number;
                    change: number;
                    game_date: string;
                    opponent_username: string;
                    game_result: string;
                }[];
            };
            get_user_rating_stats: {
                Args: {
                    p_user_id: string;
                };
                Returns: {
                    current_elo: number;
                    highest_elo: number;
                    lowest_elo: number;
                    total_games: number;
                    rating_gained: number;
                    avg_rating_change: number;
                    best_win_streak: number;
                    current_streak: number;
                    streak_type: string;
                }[];
            };
            get_rating_leaderboard: {
                Args: {
                    p_limit?: number;
                };
                Returns: {
                    rank: number;
                    user_id: string;
                    username: string;
                    elo: number;
                    games_played: number;
                    win_rate: number;
                }[];
            };
            get_lobby_statistics: {
                Args: {
                    p_game_id: string;
                };
                Returns: {
                    player_id: string;
                    username: string;
                    entered_at: string;
                    ready_at: string;
                    total_lobby_time: string;
                }[];
            };
            // User presence and ping functions
            ping_user_activity: {
                Args: {
                    p_user_id: string;
                    p_activity_type?: string;
                    p_page_context?: string;
                    p_additional_data?: any;
                };
                Returns: any;
            };
            get_user_activity_status: {
                Args: {
                    p_user_id: string;
                };
                Returns: any;
            };
            get_active_users_count: {
                Args: {};
                Returns: number;
            };
            set_user_offline_after_timeout: {
                Args: {};
                Returns: void;
            };
            // Ranking system functions
            get_user_rank: {
                Args: {
                    p_user_id: string;
                };
                Returns: {
                    rank_id: string;
                    rank_name: string;
                    rank_description: string;
                    user_elo: number;
                    min_elo: number;
                    max_elo: number | null;
                    progress_in_rank: number;
                }[];
            };
            get_ranking_leaderboard: {
                Args: {};
                Returns: {
                    rank_id: string;
                    rank_name: string;
                    rank_description: string;
                    min_elo: number;
                    max_elo: number | null;
                    user_count: number;
                    top_players: any;
                }[];
            };
            // Admin system functions
            is_user_admin: {
                Args: {
                    p_user_id: string;
                    p_required_level?: string;
                };
                Returns: boolean;
            };
            admin_update_user_status: {
                Args: {
                    p_admin_user_id: string;
                    p_target_user_id: string;
                    p_new_status: string;
                };
                Returns: any;
            };
        };
    };
}