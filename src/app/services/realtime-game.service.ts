import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Chess } from 'chess.js';

export interface GameState {
    id: string;
    white_player_id: string;
    black_player_id: string;
    current_turn: 'white' | 'black';
    game_status: 'waiting' | 'active' | 'finished';
    white_time_left: number;
    black_time_left: number;
    time_control: {
        initial_time: number;
        increment: number;
    };
    fen: string;
    moves: GameMove[];
    result?: 'white_wins' | 'black_wins' | 'draw';
    result_reason?: string;
    created_at: string;
    updated_at: string;
}

export interface GameMove {
    id: string;
    game_id: string;
    move_number: number;
    from_square: string;
    to_square: string;
    piece: string;
    captured_piece?: string;
    promotion?: string;
    is_check: boolean;
    is_checkmate: boolean;
    is_castle: boolean;
    is_en_passant: boolean;
    san: string; // Standard Algebraic Notation
    fen_after: string;
    time_left: number;
    created_at: string;
}

export interface PlayerConnection {
    user_id: string;
    game_id: string;
    is_connected: boolean;
    last_seen: string;
}

@Injectable({
    providedIn: 'root'
})
export class RealtimeGameService {
    private gameStateSubject = new BehaviorSubject<GameState | null>(null);
    public gameState$ = this.gameStateSubject.asObservable();

    private chessEngine = new Chess();
    private gameSubscription?: Subscription;
    private movesSubscription?: Subscription;
    private connectionsSubscription?: Subscription;

    constructor(private supabaseService: SupabaseService) { }

    // Load and subscribe to a game
    async loadGame(gameId: string): Promise<GameState | null> {
        try {
            // Load game data
            const { data: game, error } = await this.supabaseService.db
                .from('games')
                .select('*')
                .eq('id', gameId)
                .single();

            if (error || !game) {
                console.error('Error loading game:', error);
                return null;
            }

            // Load moves separately
            const { data: moves, error: movesError } = await this.supabaseService.db
                .from('moves')
                .select('*')
                .eq('game_id', gameId)
                .order('timestamp', { ascending: true });

            if (movesError) {
                console.error('Error loading moves:', movesError);
            }

            // Extract game state from JSONB field
            const gameStateData = game.game_state || {};
            const fen = gameStateData.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

            // Set up chess engine with current position
            this.chessEngine.load(fen);

            const gameState: GameState = {
                id: game.id,
                white_player_id: gameStateData.white_player_id || game.player1_id,
                black_player_id: gameStateData.black_player_id || game.player2_id,
                current_turn: gameStateData.current_turn || 'white',
                game_status: game.status === 'active' ? 'active' : (game.status === 'completed' ? 'finished' : 'waiting'),
                white_time_left: gameStateData.white_time_left || 900,
                black_time_left: gameStateData.black_time_left || 900,
                time_control: gameStateData.time_control || { initial_time: 900, increment: 0 },
                fen: fen,
                moves: moves?.map(move => ({
                    id: move.id,
                    game_id: move.game_id,
                    move_number: 1,
                    from_square: move.from_square || '',
                    to_square: move.to_square || '',
                    piece: '',
                    san: move.move_notation,
                    fen_after: move.fen_after || fen,
                    time_left: move.time_left || 900,
                    created_at: move.timestamp,
                    is_check: false,
                    is_checkmate: false,
                    is_castle: false,
                    is_en_passant: false
                })) || [],
                result: gameStateData.result,
                result_reason: gameStateData.result_reason,
                created_at: game.created_at,
                updated_at: game.created_at
            };

            this.gameStateSubject.next(gameState);

            // Subscribe to real-time updates
            this.subscribeToGameUpdates(gameId);
            this.subscribeToMoveUpdates(gameId);
            this.subscribeToConnectionUpdates(gameId);

            return gameState;
        } catch (error) {
            console.error('Error loading game:', error);
            return null;
        }
    }

    // Make a move
    async makeMove(from: string, to: string, promotion?: string): Promise<boolean> {
        const currentGame = this.gameStateSubject.value;
        if (!currentGame || currentGame.game_status !== 'active') {
            return false;
        }

        const user = this.supabaseService.user;
        if (!user) return false;

        // Check if it's the player's turn
        const isWhitePlayer = user.id === currentGame.white_player_id;
        const isBlackPlayer = user.id === currentGame.black_player_id;

        if (!isWhitePlayer && !isBlackPlayer) return false;

        const playerColor = isWhitePlayer ? 'white' : 'black';
        if (currentGame.current_turn !== playerColor) return false;

        try {
            // Validate move with chess.js
            const move = this.chessEngine.move({
                from,
                to,
                promotion: promotion as any
            });

            if (!move) {
                console.log('Invalid move attempted');
                return false;
            }

            // Calculate time left
            const timeLeft = playerColor === 'white'
                ? currentGame.white_time_left
                : currentGame.black_time_left;

            // Create move record
            const moveData = {
                game_id: currentGame.id,
                player_id: user.id,
                move_notation: move.san,
                from_square: from,
                to_square: to,
                fen_after: this.chessEngine.fen(),
                time_left: timeLeft,
                timestamp: new Date().toISOString()
            };

            // Insert move into database
            const { error: moveError } = await this.supabaseService.db
                .from('moves')
                .insert(moveData);

            if (moveError) {
                // Undo the move if database insert failed
                this.chessEngine.undo();
                console.error('Error inserting move:', moveError);
                return false;
            }

            // Update game state
            const newTimeLeft = timeLeft + currentGame.time_control.increment;
            const nextTurn = playerColor === 'white' ? 'black' : 'white';

            let gameStatus: 'waiting' | 'active' | 'finished' = currentGame.game_status;
            let result: 'white_wins' | 'black_wins' | 'draw' | null = null;
            let resultReason: string | null = null;

            // Check for game end conditions
            if (this.chessEngine.isCheckmate()) {
                gameStatus = 'finished';
                result = playerColor === 'white' ? 'white_wins' : 'black_wins';
                resultReason = 'checkmate';
            } else if (this.chessEngine.isDraw()) {
                gameStatus = 'finished';
                result = 'draw';
                if (this.chessEngine.isStalemate()) {
                    resultReason = 'stalemate';
                } else if (this.chessEngine.isInsufficientMaterial()) {
                    resultReason = 'insufficient_material';
                } else if (this.chessEngine.isThreefoldRepetition()) {
                    resultReason = 'threefold_repetition';
                }
            }

            // Update game state in database
            const updatedGameState = {
                ...currentGame,
                current_turn: nextTurn,
                fen: this.chessEngine.fen(),
                white_time_left: playerColor === 'white' ? newTimeLeft : currentGame.white_time_left,
                black_time_left: playerColor === 'black' ? newTimeLeft : currentGame.black_time_left,
                result: result,
                result_reason: resultReason
            };

            const gameUpdate: any = {
                game_state: updatedGameState,
                status: gameStatus === 'finished' ? 'completed' : gameStatus
            };

            const { error: gameError } = await this.supabaseService.db
                .from('games')
                .update(gameUpdate)
                .eq('id', currentGame.id);

            if (gameError) {
                console.error('Error updating game:', gameError);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error making move:', error);
            return false;
        }
    }

    // Get legal moves for a square
    getLegalMoves(square: string): string[] {
        return this.chessEngine.moves({
            square: square as any,
            verbose: true
        }).map(move => move.to);
    }

    // Check if a move is legal
    isLegalMove(from: string, to: string): boolean {
        const moves = this.chessEngine.moves({
            square: from as any,
            verbose: true
        });
        return moves.some(move => move.to === to);
    }

    // Update player connection status
    async updateConnectionStatus(gameId: string, isConnected: boolean): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        const connectionData = {
            user_id: user.id,
            game_id: gameId,
            is_connected: isConnected,
            last_seen: new Date().toISOString()
        };

        await this.supabaseService.db
            .from('player_connections')
            .upsert(connectionData, {
                onConflict: 'user_id,game_id'
            });
    }

    // Offer draw
    async offerDraw(gameId: string): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        await this.supabaseService.db
            .from('game_actions')
            .insert({
                game_id: gameId,
                player_id: user.id,
                action_type: 'draw_offer'
            });
    }

    // Accept draw
    async acceptDraw(gameId: string): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        // Insert accept action
        await this.supabaseService.db
            .from('game_actions')
            .insert({
                game_id: gameId,
                player_id: user.id,
                action_type: 'draw_accept'
            });

        // Get current game state and update with draw result
        const currentGame = this.gameStateSubject.value;
        if (currentGame) {
            const updatedGameState = {
                ...currentGame,
                result: 'draw',
                result_reason: 'agreement'
            };

            await this.supabaseService.db
                .from('games')
                .update({
                    game_state: updatedGameState,
                    status: 'completed'
                })
                .eq('id', gameId);
        }
    }

    // Resign game
    async resignGame(gameId: string): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        const currentGame = this.gameStateSubject.value;
        if (!currentGame) return;

        const isWhitePlayer = user.id === currentGame.white_player_id;
        const result = isWhitePlayer ? 'black_wins' : 'white_wins';

        // Insert resign action
        await this.supabaseService.db
            .from('game_actions')
            .insert({
                game_id: gameId,
                player_id: user.id,
                action_type: 'resign'
            });

        // Update game result
        const updatedGameState = {
            ...currentGame,
            result: result,
            result_reason: 'resignation'
        };

        await this.supabaseService.db
            .from('games')
            .update({
                game_state: updatedGameState,
                status: 'completed'
            })
            .eq('id', gameId);
    }

    // Subscribe to game updates
    private subscribeToGameUpdates(gameId: string): void {
        const channel = this.supabaseService.db
            .channel(`game-${gameId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'games',
                filter: `id=eq.${gameId}`
            }, (payload) => {
                this.handleGameUpdate(payload.new as any);
            });

        channel.subscribe();

        this.gameSubscription = new Subscription(() => {
            channel.unsubscribe();
        });
    }

    // Subscribe to move updates
    private subscribeToMoveUpdates(gameId: string): void {
        const channel = this.supabaseService.db
            .channel(`moves-${gameId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'moves',
                filter: `game_id=eq.${gameId}`
            }, (payload) => {
                this.handleMoveUpdate(payload.new as any);
            });

        channel.subscribe();

        this.movesSubscription = new Subscription(() => {
            channel.unsubscribe();
        });
    }

    // Subscribe to connection updates
    private subscribeToConnectionUpdates(gameId: string): void {
        const channel = this.supabaseService.db
            .channel(`connections-${gameId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'player_connections',
                filter: `game_id=eq.${gameId}`
            }, (payload) => {
                console.log('Connection update:', payload);
            });

        channel.subscribe();

        this.connectionsSubscription = new Subscription(() => {
            channel.unsubscribe();
        });
    }

    // Handle game state updates
    private handleGameUpdate(gameData: any): void {
        const currentGame = this.gameStateSubject.value;
        if (!currentGame) return;

        const gameStateData = gameData.game_state || {};

        // Update chess engine position if FEN changed
        if (gameStateData.fen && gameStateData.fen !== currentGame.fen) {
            this.chessEngine.load(gameStateData.fen);
        }

        // Update game state
        const updatedGame: GameState = {
            ...currentGame,
            current_turn: gameStateData.current_turn || currentGame.current_turn,
            game_status: gameData.status === 'completed' ? 'finished' : (gameData.status === 'active' ? 'active' : 'waiting'),
            white_time_left: gameStateData.white_time_left || currentGame.white_time_left,
            black_time_left: gameStateData.black_time_left || currentGame.black_time_left,
            fen: gameStateData.fen || currentGame.fen,
            result: gameStateData.result,
            result_reason: gameStateData.result_reason,
            updated_at: gameData.created_at || currentGame.updated_at
        };

        this.gameStateSubject.next(updatedGame);
    }

    // Handle new moves
    private handleMoveUpdate(moveData: any): void {
        const currentGame = this.gameStateSubject.value;
        if (!currentGame) return;

        // Convert move data to GameMove format
        const move: GameMove = {
            id: moveData.id,
            game_id: moveData.game_id,
            move_number: currentGame.moves.length + 1,
            from_square: moveData.from_square || '',
            to_square: moveData.to_square || '',
            piece: '',
            san: moveData.move_notation,
            fen_after: moveData.fen_after || currentGame.fen,
            time_left: moveData.time_left || 900,
            created_at: moveData.timestamp,
            is_check: false,
            is_checkmate: false,
            is_castle: false,
            is_en_passant: false
        };

        // Update moves array
        const updatedGame: GameState = {
            ...currentGame,
            moves: [...currentGame.moves, move]
        };

        this.gameStateSubject.next(updatedGame);
    }

    // Cleanup subscriptions
    cleanup(): void {
        if (this.gameSubscription) {
            this.gameSubscription.unsubscribe();
        }
        if (this.movesSubscription) {
            this.movesSubscription.unsubscribe();
        }
        if (this.connectionsSubscription) {
            this.connectionsSubscription.unsubscribe();
        }
    }

    // Get current chess engine instance
    get chess(): Chess {
        return this.chessEngine;
    }
} 