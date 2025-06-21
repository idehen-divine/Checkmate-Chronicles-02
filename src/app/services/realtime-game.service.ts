import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject } from 'rxjs';

export interface RealtimeGameState {
    id: string;
    player1_id: string;
    player2_id: string;
    game_state: {
        board: string;
        moves: string[];
        current_turn: 'white' | 'black';
        white_time_left: number;
        black_time_left: number;
        time_control: {
            initial_time: number;
            increment: number;
        };
        last_move_time?: string;
    };
    status: string;
    created_at: string;
    started_at?: string;
    finished_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class RealtimeGameService {
    private gameStateSubject = new BehaviorSubject<RealtimeGameState | null>(null);
    public gameState$ = this.gameStateSubject.asObservable();

    private currentGameId?: string;

    constructor(private supabaseService: SupabaseService) { }

    async joinGame(gameId: string): Promise<void> {
        this.currentGameId = gameId;
        console.log('Joining game:', gameId);
    }

    async leaveGame(): Promise<void> {
        console.log('Leaving game:', this.currentGameId);
        this.gameStateSubject.next(null);
        this.currentGameId = undefined;
    }

    async makeMove(move: { from: string; to: string; san: string; fen: string }): Promise<void> {
        console.log('Making move:', move);
    }

    getCurrentGameState(): RealtimeGameState | null {
        return this.gameStateSubject.value;
    }

    isPlayerTurn(): boolean {
        return true; // Mock implementation
    }

    getPlayerColor(): 'white' | 'black' | null {
        return 'white'; // Mock implementation
    }
} 