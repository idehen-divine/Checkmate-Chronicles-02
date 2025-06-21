import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as ReplayUtils from '../utils/chess-replay.util';
import { LiveGameMove } from '../types/game.types';

@Injectable({
    providedIn: 'root'
})
export class ChessReplayService {
    private replayState = new BehaviorSubject<ReplayUtils.ReplayState>(
        ReplayUtils.createReplayState()
    );

    public replayState$ = this.replayState.asObservable();

    constructor() { }

    /**
     * Enter replay mode
     */
    enterReplayMode(gameHistory: LiveGameMove[], currentGameState: string): void {
        const newState = ReplayUtils.enterReplayMode(gameHistory, currentGameState);
        this.replayState.next(newState);
    }

    /**
     * Exit replay mode
     */
    exitReplayMode(): void {
        const newState = ReplayUtils.exitReplayMode();
        this.replayState.next(newState);
    }

    /**
     * Navigate to specific position
     */
    navigateToPosition(position: number): void {
        const currentState = this.replayState.value;

        if (!ReplayUtils.isValidReplayPosition(position, currentState.moves.length)) {
            return;
        }

        this.replayState.next({
            ...currentState,
            position
        });
    }

    /**
     * Go to next move
     */
    nextMove(): void {
        const currentState = this.replayState.value;
        const nextPosition = ReplayUtils.getNextPosition(
            currentState.position,
            currentState.moves.length
        );
        this.navigateToPosition(nextPosition);
    }

    /**
     * Go to previous move
     */
    previousMove(): void {
        const currentState = this.replayState.value;
        const previousPosition = ReplayUtils.getPreviousPosition(currentState.position);
        this.navigateToPosition(previousPosition);
    }

    /**
     * Go to start of game
     */
    goToStart(): void {
        const startPosition = ReplayUtils.getStartPosition();
        this.navigateToPosition(startPosition);
    }

    /**
     * Go to end of game
     */
    goToEnd(): void {
        const currentState = this.replayState.value;
        const endPosition = ReplayUtils.getEndPosition(currentState.moves.length);
        this.navigateToPosition(endPosition);
    }

    /**
     * Check if can navigate to previous move
     */
    canNavigatePrevious(): Observable<boolean> {
        return new Observable(observer => {
            this.replayState$.subscribe(state => {
                observer.next(ReplayUtils.canNavigatePrevious(state));
            });
        });
    }

    /**
     * Check if can navigate to next move
     */
    canNavigateNext(): Observable<boolean> {
        return new Observable(observer => {
            this.replayState$.subscribe(state => {
                observer.next(ReplayUtils.canNavigateNext(state));
            });
        });
    }

    /**
     * Get current move description
     */
    getCurrentMoveDescription(): Observable<string> {
        return new Observable(observer => {
            this.replayState$.subscribe(state => {
                const description = ReplayUtils.getCurrentMoveDescription(
                    state.position,
                    state.moves
                );
                observer.next(description);
            });
        });
    }

    /**
     * Get replay progress percentage
     */
    getReplayProgress(): Observable<number> {
        return new Observable(observer => {
            this.replayState$.subscribe(state => {
                const progress = ReplayUtils.getReplayProgress(
                    state.position,
                    state.moves.length
                );
                observer.next(progress);
            });
        });
    }

    /**
     * Get current replay state
     */
    getCurrentState(): ReplayUtils.ReplayState {
        return this.replayState.value;
    }

    /**
     * Check if currently in replay mode
     */
    isReplayMode(): Observable<boolean> {
        return new Observable(observer => {
            this.replayState$.subscribe(state => {
                observer.next(state.isReplayMode);
            });
        });
    }

    /**
     * Get moves up to current position for chess engine
     */
    getMovesToPosition(): LiveGameMove[] {
        const currentState = this.replayState.value;
        return currentState.moves.slice(0, currentState.position);
    }
}
