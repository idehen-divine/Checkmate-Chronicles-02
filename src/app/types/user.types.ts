export interface UserProfile {
    name: string;
    username: string;
    email?: string;
    rank: string;
    avatar: string;
    currentElo?: number;
    highestElo?: number;
}

export interface UserStats {
    wins: string;
    losses: number;
    draws?: number;
    nfts: number;
    streak: number;
    games: number;
    winPercentage?: number;
}