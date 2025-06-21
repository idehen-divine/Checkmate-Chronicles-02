import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import {
    ChessSquare,
    ChessPiece,
    GameState,
    Player,
    GameMove
} from '../types/game.types';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    private gameStateSubject = new BehaviorSubject<GameState | null>(null);
    public gameState$ = this.gameStateSubject.asObservable();

    constructor() { }

    // Initialize a new game
    createGame(whitePlayer: Player, blackPlayer: Player): GameState {
        const gameState: GameState = {
            id: this.generateGameId(),
            whitePlayer,
            blackPlayer,
            currentTurn: 'white',
            gameStatus: 'active',
            timeControl: {
                initialTime: 600, // 10 minutes
                increment: 5
            },
            whiteTimeLeft: 600,
            blackTimeLeft: 600,
            moves: [],
            board: this.initializeBoard()
        };

        this.gameStateSubject.next(gameState);
        return gameState;
    }

    // Load existing game
    loadGame(gameId: string): Observable<GameState> {
        // TODO: Implement actual game loading from Supabase
        return new Observable(observer => {
            // Mock game for now
            const mockGame = this.createMockGame();
            this.gameStateSubject.next(mockGame);
            observer.next(mockGame);
            observer.complete();
        });
    }

    // Make a move
    makeMove(from: { row: number; col: number }, to: { row: number; col: number }): boolean {
        const currentState = this.gameStateSubject.value;
        if (!currentState || currentState.gameStatus !== 'active') {
            return false;
        }

        const fromSquare = currentState.board[from.row][from.col];
        const toSquare = currentState.board[to.row][to.col];

        if (!fromSquare.piece || fromSquare.piece.color !== currentState.currentTurn) {
            return false;
        }

        // Validate move (simplified)
        if (!this.isValidMove(from, to, currentState)) {
            return false;
        }

        // Execute move
        const move: GameMove = {
            from,
            to,
            piece: fromSquare.piece,
            capturedPiece: toSquare.piece || undefined,
            notation: this.generateMoveNotation(from, to, fromSquare.piece, toSquare.piece),
            timestamp: new Date(),
            timeLeft: currentState.currentTurn === 'white' ? currentState.whiteTimeLeft : currentState.blackTimeLeft
        };

        // Update board
        toSquare.piece = fromSquare.piece;
        fromSquare.piece = null;
        toSquare.piece.hasMoved = true;

        // Clear previous highlights
        currentState.board.forEach(row => {
            row.forEach(square => {
                square.isLastMove = false;
            });
        });

        // Highlight move
        fromSquare.isLastMove = true;
        toSquare.isLastMove = true;

        // Add to move history
        currentState.moves.push(move);

        // Switch turns
        currentState.currentTurn = currentState.currentTurn === 'white' ? 'black' : 'white';

        // Add time increment
        if (currentState.currentTurn === 'white') {
            currentState.blackTimeLeft += currentState.timeControl.increment;
        } else {
            currentState.whiteTimeLeft += currentState.timeControl.increment;
        }

        this.gameStateSubject.next(currentState);
        return true;
    }

    // Get possible moves for a piece
    getPossibleMoves(row: number, col: number): { row: number; col: number }[] {
        const currentState = this.gameStateSubject.value;
        if (!currentState) return [];

        const piece = currentState.board[row][col].piece;
        if (!piece) return [];

        return this.calculatePossibleMoves(row, col, piece, currentState);
    }

    // Check if move is valid
    private isValidMove(from: { row: number; col: number }, to: { row: number; col: number }, gameState: GameState): boolean {
        const possibleMoves = this.getPossibleMoves(from.row, from.col);
        return possibleMoves.some(move => move.row === to.row && move.col === to.col);
    }

    // Calculate possible moves for a piece
    private calculatePossibleMoves(row: number, col: number, piece: ChessPiece, gameState: GameState): { row: number; col: number }[] {
        const moves: { row: number; col: number }[] = [];

        switch (piece.type) {
            case 'pawn':
                moves.push(...this.getPawnMoves(row, col, piece, gameState));
                break;
            case 'rook':
                moves.push(...this.getRookMoves(row, col, piece, gameState));
                break;
            case 'knight':
                moves.push(...this.getKnightMoves(row, col, piece, gameState));
                break;
            case 'bishop':
                moves.push(...this.getBishopMoves(row, col, piece, gameState));
                break;
            case 'queen':
                moves.push(...this.getQueenMoves(row, col, piece, gameState));
                break;
            case 'king':
                moves.push(...this.getKingMoves(row, col, piece, gameState));
                break;
        }

        return moves.filter(move => this.isSquareValid(move.row, move.col));
    }

    private getPawnMoves(row: number, col: number, piece: ChessPiece, gameState: GameState): { row: number; col: number }[] {
        const moves: { row: number; col: number }[] = [];
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;

        // Forward move
        const forwardRow = row + direction;
        if (this.isSquareValid(forwardRow, col) && !gameState.board[forwardRow][col].piece) {
            moves.push({ row: forwardRow, col });

            // Double move from starting position
            if (row === startRow) {
                const doubleForwardRow = row + (direction * 2);
                if (this.isSquareValid(doubleForwardRow, col) && !gameState.board[doubleForwardRow][col].piece) {
                    moves.push({ row: doubleForwardRow, col });
                }
            }
        }

        // Capture moves
        for (const captureCol of [col - 1, col + 1]) {
            if (this.isSquareValid(forwardRow, captureCol)) {
                const captureSquare = gameState.board[forwardRow][captureCol];
                if (captureSquare.piece && captureSquare.piece.color !== piece.color) {
                    moves.push({ row: forwardRow, col: captureCol });
                }
            }
        }

        return moves;
    }

    private getRookMoves(row: number, col: number, piece: ChessPiece, gameState: GameState): { row: number; col: number }[] {
        const moves: { row: number; col: number }[] = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + (dRow * i);
                const newCol = col + (dCol * i);

                if (!this.isSquareValid(newRow, newCol)) break;

                const targetSquare = gameState.board[newRow][newCol];
                if (!targetSquare.piece) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (targetSquare.piece.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
            }
        }

        return moves;
    }

    private getKnightMoves(row: number, col: number, piece: ChessPiece, gameState: GameState): { row: number; col: number }[] {
        const moves: { row: number; col: number }[] = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dRow, dCol] of knightMoves) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isSquareValid(newRow, newCol)) {
                const targetSquare = gameState.board[newRow][newCol];
                if (!targetSquare.piece || targetSquare.piece.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    private getBishopMoves(row: number, col: number, piece: ChessPiece, gameState: GameState): { row: number; col: number }[] {
        const moves: { row: number; col: number }[] = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + (dRow * i);
                const newCol = col + (dCol * i);

                if (!this.isSquareValid(newRow, newCol)) break;

                const targetSquare = gameState.board[newRow][newCol];
                if (!targetSquare.piece) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (targetSquare.piece.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
            }
        }

        return moves;
    }

    private getQueenMoves(row: number, col: number, piece: ChessPiece, gameState: GameState): { row: number; col: number }[] {
        return [
            ...this.getRookMoves(row, col, piece, gameState),
            ...this.getBishopMoves(row, col, piece, gameState)
        ];
    }

    private getKingMoves(row: number, col: number, piece: ChessPiece, gameState: GameState): { row: number; col: number }[] {
        const moves: { row: number; col: number }[] = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isSquareValid(newRow, newCol)) {
                const targetSquare = gameState.board[newRow][newCol];
                if (!targetSquare.piece || targetSquare.piece.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    private isSquareValid(row: number, col: number): boolean {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    private initializeBoard(): ChessSquare[][] {
        const board: ChessSquare[][] = [];

        // Initialize empty board
        for (let row = 0; row < 8; row++) {
            board[row] = [];
            for (let col = 0; col < 8; col++) {
                board[row][col] = {
                    row,
                    col,
                    piece: null,
                    isHighlighted: false,
                    isPossibleMove: false,
                    isSelected: false,
                    isCheck: false,
                    isLastMove: false
                };
            }
        }

        // Set up initial pieces
        this.setupInitialPieces(board);
        return board;
    }

    private setupInitialPieces(board: ChessSquare[][]) {
        // Black pieces (top)
        const blackPieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'] as const;
        for (let col = 0; col < 8; col++) {
            board[0][col].piece = { type: blackPieces[col], color: 'black', hasMoved: false };
            board[1][col].piece = { type: 'pawn', color: 'black', hasMoved: false };
        }

        // White pieces (bottom)
        const whitePieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'] as const;
        for (let col = 0; col < 8; col++) {
            board[7][col].piece = { type: whitePieces[col], color: 'white', hasMoved: false };
            board[6][col].piece = { type: 'pawn', color: 'white', hasMoved: false };
        }
    }

    private createMockGame(): GameState {
        return {
            id: 'game-123',
            whitePlayer: {
                id: 'player1',
                username: 'ChessGrandmaster',
                avatar: 'assets/images/profile-avatar.png',
                rating: 1850,
                rank: 'Expert',
                isOnline: true
            },
            blackPlayer: {
                id: 'player2',
                username: 'TacticalGenius',
                avatar: 'assets/images/profile-avatar-large.png',
                rating: 1820,
                rank: 'Expert',
                isOnline: true
            },
            currentTurn: 'white',
            gameStatus: 'active',
            timeControl: {
                initialTime: 600,
                increment: 5
            },
            whiteTimeLeft: 580,
            blackTimeLeft: 595,
            moves: [],
            board: this.initializeBoard()
        };
    }

    private generateGameId(): string {
        return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    private generateMoveNotation(from: { row: number; col: number }, to: { row: number; col: number }, piece: ChessPiece, capturedPiece?: ChessPiece | null): string {
        const files = 'abcdefgh';
        const fromFile = files[from.col];
        const fromRank = (8 - from.row).toString();
        const toFile = files[to.col];
        const toRank = (8 - to.row).toString();

        const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
        const capture = capturedPiece ? 'x' : '';

        return `${pieceSymbol}${capture}${toFile}${toRank}`;
    }

    // Update game timer
    updateTimer(color: 'white' | 'black', timeLeft: number): void {
        const currentState = this.gameStateSubject.value;
        if (!currentState) return;

        if (color === 'white') {
            currentState.whiteTimeLeft = timeLeft;
        } else {
            currentState.blackTimeLeft = timeLeft;
        }

        this.gameStateSubject.next(currentState);
    }

    // End game
    endGame(result: 'white_wins' | 'black_wins' | 'draw'): void {
        const currentState = this.gameStateSubject.value;
        if (!currentState) return;

        currentState.gameStatus = 'finished';
        currentState.result = result;
        this.gameStateSubject.next(currentState);
    }

    // Pause/Resume game
    togglePause(): void {
        const currentState = this.gameStateSubject.value;
        if (!currentState) return;

        if (currentState.gameStatus === 'active') {
            currentState.gameStatus = 'paused';
        } else if (currentState.gameStatus === 'paused') {
            currentState.gameStatus = 'active';
        }

        this.gameStateSubject.next(currentState);
    }
}
