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
                    game_type: string;
                    status: 'waiting' | 'matching' | 'matched' | 'cancelled';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    player_id: string;
                    game_type: string;
                    status?: 'waiting' | 'matching' | 'matched' | 'cancelled';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    player_id?: string;
                    game_type?: string;
                    status?: 'waiting' | 'matching' | 'matched' | 'cancelled';
                    created_at?: string;
                    updated_at?: string;
                };
            };
            games: {
                Row: {
                    id: string;
                    player1_id: string;
                    player2_id: string;
                    game_type: string;
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
                    game_type: string;
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
                    game_type?: string;
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
            // Cleanup functions for all tables
            cleanup_old_game_moves: {
                Args: {};
                Returns: void;
            };
            cleanup_old_game_messages: {
                Args: {};
                Returns: void;
            };
            cleanup_old_game_events: {
                Args: {};
                Returns: void;
            };
            cleanup_old_game_lobby_logs: {
                Args: {};
                Returns: void;
            };
            cleanup_old_rating_history: {
                Args: {};
                Returns: void;
            };
            cleanup_old_games: {
                Args: {};
                Returns: void;
            };
            cleanup_old_matchmaking_queue: {
                Args: {};
                Returns: void;
            };
            // Statistics functions for all tables
            get_game_moves_stats: {
                Args: {};
                Returns: {
                    total_moves: number;
                    moves_last_week: number;
                    moves_last_month: number;
                    active_game_moves: number;
                    finished_game_moves: number;
                    oldest_move: string;
                    newest_move: string;
                }[];
            };
            get_game_messages_stats: {
                Args: {};
                Returns: {
                    total_messages: number;
                    messages_last_week: number;
                    messages_last_month: number;
                    active_game_messages: number;
                    finished_game_messages: number;
                    system_messages: number;
                    user_messages: number;
                    oldest_message: string;
                    newest_message: string;
                }[];
            };
            get_game_events_stats: {
                Args: {};
                Returns: {
                    total_events: number;
                    events_last_week: number;
                    events_last_month: number;
                    move_events_count: number;
                    game_events_count: number;
                    oldest_event: string;
                    newest_event: string;
                }[];
            };
            get_game_lobby_logs_stats: {
                Args: {};
                Returns: {
                    total_logs: number;
                    logs_last_week: number;
                    logs_last_month: number;
                    active_game_logs: number;
                    finished_game_logs: number;
                    entered_logs: number;
                    left_logs: number;
                    ready_logs: number;
                    oldest_log: string;
                    newest_log: string;
                }[];
            };
            get_rating_history_stats: {
                Args: {};
                Returns: {
                    total_records: number;
                    records_last_week: number;
                    records_last_month: number;
                    unique_users: number;
                    avg_rating_change: number;
                    max_rating_gain: number;
                    max_rating_loss: number;
                    oldest_record: string;
                    newest_record: string;
                }[];
            };
            get_games_stats: {
                Args: {};
                Returns: {
                    total_games: number;
                    games_last_week: number;
                    games_last_month: number;
                    active_games: number;
                    finished_games: number;
                    game_types_breakdown: any; // JSONB object with game_type: count pairs
                    oldest_game: string;
                    newest_game: string;
                }[];
            };
            get_matchmaking_queue_stats: {
                Args: {};
                Returns: {
                    total_entries: number;
                    entries_last_week: number;
                    entries_last_month: number;
                    waiting_entries: number;
                    matched_entries: number;
                    cancelled_entries: number;
                    game_types_breakdown: any; // JSONB object with game_type: count pairs
                    avg_wait_time: string;
                    oldest_entry: string;
                    newest_entry: string;
                }[];
            };
            manual_cleanup_game_events: {
                Args: {};
                Returns: {
                    deleted_count: number;
                    message: string;
                }[];
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