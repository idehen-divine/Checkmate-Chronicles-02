export interface ChessSquare {
	row: number;
	col: number;
	piece: ChessPiece | null;
	isHighlighted: boolean;
	isPossibleMove: boolean;
	isSelected: boolean;
	isCheck: boolean;
	isLastMove: boolean;
}

export interface ChessPiece {
	type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
	color: 'white' | 'black';
	hasMoved: boolean;
}

export interface GameState {
	id: string;
	whitePlayer: Player;
	blackPlayer: Player;
	currentTurn: 'white' | 'black';
	gameStatus: 'waiting' | 'active' | 'paused' | 'finished';
	result?: 'white_wins' | 'black_wins' | 'draw';
	timeControl: {
		initialTime: number;
		increment: number;
	};
	whiteTimeLeft: number;
	blackTimeLeft: number;
	moves: GameMove[];
	board: ChessSquare[][];
}

export interface Player {
	id: string;
	username: string;
	avatar: string;
	rating: number;
	rank: string;
	isOnline: boolean;
}

export interface GameMove {
	from: { row: number; col: number };
	to: { row: number; col: number };
	piece: ChessPiece;
	capturedPiece?: ChessPiece;
	notation: string;
	timestamp: Date;
	timeLeft: number;
}

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

// Game page specific interfaces for live games
export interface LiveGameMove {
	notation: string;
	timestamp: Date;
	from: string;
	to: string;
	promotion?: string;
	playerId: string; // Track which player made this move
}

export interface LiveGamePlayer {
	id: string;
	username: string;
	avatar: string;
	walletAddress: string;
	timeRemaining: number; // in seconds
	rating: number;
	rank: string;
	isOnline: boolean;
}
