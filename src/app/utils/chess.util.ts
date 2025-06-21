/**
 * Pure utility functions for chess game logic
 * Use these for lightweight chess operations without Angular dependencies
 */

export type ChessPiece = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type ChessColor = 'white' | 'black';
export type ChessPosition = { row: number; col: number };

/**
 * Calculate ELO rating change
 */
export function calculateEloChange(
    playerRating: number, 
    opponentRating: number, 
    gameResult: 'win' | 'draw' | 'loss',
    kFactor: number = 32
): number {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    
    let actualScore: number;
    switch (gameResult) {
        case 'win':
            actualScore = 1;
            break;
        case 'draw':
            actualScore = 0.5;
            break;
        case 'loss':
            actualScore = 0;
            break;
    }
    
    return Math.round(kFactor * (actualScore - expectedScore));
}

/**
 * Get chess rank based on ELO rating
 */
export function getChessRank(elo: number): string {
    if (elo < 800) return 'Beginner';
    if (elo < 1000) return 'Novice';
    if (elo < 1200) return 'Amateur';
    if (elo < 1400) return 'Intermediate';
    if (elo < 1600) return 'Advanced';
    if (elo < 1800) return 'Expert';
    if (elo < 2000) return 'Master';
    if (elo < 2200) return 'International Master';
    if (elo >= 2200) return 'Grandmaster';
    return 'Unrated';
}

/**
 * Format game duration
 */
export function formatGameDuration(startTime: Date, endTime: Date): string {
    const durationMs = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

/**
 * Parse chess notation (basic algebraic notation)
 */
export function parseChessNotation(notation: string): { 
    piece: ChessPiece; 
    from?: ChessPosition; 
    to: ChessPosition; 
    isCapture: boolean;
    isCheck: boolean;
    isCheckmate: boolean;
} | null {
    // This is a simplified parser - you'd want a more robust one for production
    const cleanNotation = notation.replace(/[+#]$/, '');
    const isCheck = notation.includes('+');
    const isCheckmate = notation.includes('#');
    const isCapture = cleanNotation.includes('x');
    
    // Basic parsing logic would go here
    // For now, returning null to indicate this needs full implementation
    return null;
}

/**
 * Convert position notation to coordinates
 */
export function notationToPosition(notation: string): ChessPosition | null {
    if (notation.length !== 2) return null;
    
    const col = notation.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = parseInt(notation[1]) - 1;
    
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    
    return { row, col };
}

/**
 * Convert coordinates to position notation
 */
export function positionToNotation(position: ChessPosition): string | null {
    if (position.row < 0 || position.row > 7 || position.col < 0 || position.col > 7) {
        return null;
    }
    
    const col = String.fromCharCode('a'.charCodeAt(0) + position.col);
    const row = (position.row + 1).toString();
    
    return col + row;
}

/**
 * Calculate game statistics
 */
export function calculateGameStats(games: Array<{
    result: 'win' | 'draw' | 'loss';
    duration_minutes: number;
    player_rating_before: number;
    player_rating_after: number;
}>): {
    totalGames: number;
    wins: number;
    draws: number;
    losses: number;
    winRate: number;
    averageDuration: number;
    ratingChange: number;
} {
    const totalGames = games.length;
    const wins = games.filter(g => g.result === 'win').length;
    const draws = games.filter(g => g.result === 'draw').length;
    const losses = games.filter(g => g.result === 'loss').length;
    
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const averageDuration = totalGames > 0 ? 
        games.reduce((sum, g) => sum + g.duration_minutes, 0) / totalGames : 0;
    
    const ratingChange = totalGames > 0 ? 
        games[games.length - 1].player_rating_after - games[0].player_rating_before : 0;
    
    return {
        totalGames,
        wins,
        draws,
        losses,
        winRate: Math.round(winRate * 100) / 100,
        averageDuration: Math.round(averageDuration * 100) / 100,
        ratingChange
    };
}

/**
 * Format match result for display
 */
export function formatMatchResult(result: 'win' | 'loss' | 'draw'): string {
    switch (result) {
        case 'win':
            return 'Won';
        case 'loss':
            return 'Lost';
        case 'draw':
            return 'Draw';
        default:
            return 'Unknown';
    }
}

/**
 * Format ELO change for display
 */
export function formatEloChange(change: number): string {
    if (change > 0) {
        return `+${change}`;
    }
    return `${change}`;
}

/**
 * Format opponent name with fallback
 */
export function formatOpponentName(name?: string): string {
    return name || 'Unknown Player';
}

/**
 * Create match history item from raw data
 */
export function createMatchHistoryItem(data: any): {
    opponentId: string;
    opponentName: string;
    result: string;
    eloChange: string;
    date: string;
} {
    return {
        opponentId: data.opponent_id || 'unknown',
        opponentName: formatOpponentName(data.opponent_username),
        result: formatMatchResult(data.game_result),
        eloChange: formatEloChange(data.elo_change),
        date: new Date(data.date).toLocaleDateString()
    };
}

/**
 * Calculate win rate from games
 */
export function calculateWinRate(games: Array<{ result: 'win' | 'loss' | 'draw' }>): number {
    if (games.length === 0) return 0;
    
    const wins = games.filter(game => game.result === 'win').length;
    return Math.round((wins / games.length) * 100);
}
