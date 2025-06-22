import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import * as GameTimerUtils from '../utils/game-timer.util';
import { OnDestroy } from '@angular/core';

export interface TimerState {
    player1Time: number;
    player2Time: number;
    currentPlayer: 'player1' | 'player2';
    isRunning: boolean;
    timeExpired: boolean;
    expiredPlayer?: 'player1' | 'player2';
}

@Injectable({
    providedIn: 'root'
})
export class GameTimerService implements OnDestroy {
    private timerState = new BehaviorSubject<TimerState>({
        player1Time: 900, // 15 minutes default
        player2Time: 900,
        currentPlayer: 'player1',
        isRunning: false,
        timeExpired: false
    });

    private timerSubscription?: Subscription;
    public timerState$ = this.timerState.asObservable();

    constructor() { }

    /**
     * Initialize timer with custom times
     */
    initializeTimer(
        player1Time: number,
        player2Time: number,
        currentPlayer: 'player1' | 'player2' = 'player1'
    ): void {
        this.stopTimer();
        this.timerState.next({
            player1Time,
            player2Time,
            currentPlayer,
            isRunning: false,
            timeExpired: false
        });
    }

    /**
     * Start the timer
     */
    startTimer(): void {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
        }

        const currentState = this.timerState.value;
        if (currentState.timeExpired) return;

        this.timerState.next({
            ...currentState,
            isRunning: true
        });

        this.timerSubscription = interval(1000).subscribe(() => {
            this.tick();
        });
    }

    /**
     * Stop the timer
     */
    stopTimer(): void {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
            this.timerSubscription = undefined;
        }

        const currentState = this.timerState.value;
        this.timerState.next({
            ...currentState,
            isRunning: false
        });
    }

    /**
     * Switch active player
     */
    switchPlayer(): void {
        const currentState = this.timerState.value;
        this.timerState.next({
            ...currentState,
            currentPlayer: currentState.currentPlayer === 'player1' ? 'player2' : 'player1'
        });
    }

    /**
     * Add time increment to current player
     */
    addIncrement(increment: number): void {
        const currentState = this.timerState.value;
        const updatedState = { ...currentState };

        if (currentState.currentPlayer === 'player1') {
            updatedState.player1Time = Math.max(0, updatedState.player1Time + increment);
        } else {
            updatedState.player2Time = Math.max(0, updatedState.player2Time + increment);
        }

        this.timerState.next(updatedState);
    }

    /**
     * Reset timer to initial state
     */
    resetTimer(player1Time: number = 900, player2Time: number = 900): void {
        this.stopTimer();
        this.timerState.next({
            player1Time,
            player2Time,
            currentPlayer: 'player1',
            isRunning: false,
            timeExpired: false
        });
    }

    /**
     * Get formatted time for display
     */
    getFormattedTime(player: 'player1' | 'player2'): Observable<string> {
        return new Observable(observer => {
            this.timerState$.subscribe(state => {
                const time = player === 'player1' ? state.player1Time : state.player2Time;
                observer.next(GameTimerUtils.formatTime(time));
            });
        });
    }

    /**
     * Check if player time is in danger zone
     */
    isPlayerInDanger(player: 'player1' | 'player2'): Observable<boolean> {
        return new Observable(observer => {
            this.timerState$.subscribe(state => {
                const time = player === 'player1' ? state.player1Time : state.player2Time;
                const isCurrentPlayer = state.currentPlayer === player;
                const isDanger = GameTimerUtils.isDangerTime(time) && isCurrentPlayer && !state.timeExpired;
                observer.next(isDanger);
            });
        });
    }

    /**
     * Get current timer state
     */
    getCurrentState(): TimerState {
        return this.timerState.value;
    }

    private tick(): void {
        const currentState = this.timerState.value;

        if (!currentState.isRunning || currentState.timeExpired) {
            return;
        }

        const updatedState = { ...currentState };

        if (currentState.currentPlayer === 'player1') {
            updatedState.player1Time = Math.max(0, updatedState.player1Time - 1);
            if (updatedState.player1Time === 0) {
                updatedState.timeExpired = true;
                updatedState.expiredPlayer = 'player1';
                updatedState.isRunning = false;
                this.stopTimer();
            }
        } else {
            updatedState.player2Time = Math.max(0, updatedState.player2Time - 1);
            if (updatedState.player2Time === 0) {
                updatedState.timeExpired = true;
                updatedState.expiredPlayer = 'player2';
                updatedState.isRunning = false;
                this.stopTimer();
            }
        }

        this.timerState.next(updatedState);
    }

    ngOnDestroy(): void {
        this.stopTimer();
    }
}
