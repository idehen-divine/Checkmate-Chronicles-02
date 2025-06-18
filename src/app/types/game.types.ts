export interface ChessRank {
    id: string;
    name: string;
    display_name: string;
    min_elo: number;
    max_elo: number | null;
    color_code: string;
    rank_order: number;
}

export interface RatingHistoryItem {
    id: string;
    date: string;
    elo: number;
    elo_change: number;
    rank_name: string;
    game_result: 'win' | 'loss' | 'draw';
    opponent_username?: string;
} 