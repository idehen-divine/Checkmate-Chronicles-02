/**
 * Pure utility functions for chess game replay functionality
 * These functions handle replay state and move navigation without Angular dependencies
 */

import { LiveGameMove } from '../types/game.types';

export interface ReplayState {
    isReplayMode: boolean;
    position: number;
    moves: LiveGameMove[];
    originalGameState: string | null;
}

/**
 * Initialize replay state
 */
export function createReplayState(): ReplayState {
    return {
        isReplayMode: false,
        position: 0,
        moves: [],
        originalGameState: null
    };
}

/**
 * Enter replay mode with game history
 */
export function enterReplayMode(
    gameHistory: LiveGameMove[],
    currentGameState: string
): ReplayState {
    return {
        isReplayMode: true,
        position: 0,
        moves: [...gameHistory], // Create a snapshot
        originalGameState: currentGameState
    };
}

/**
 * Exit replay mode
 */
export function exitReplayMode(): ReplayState {
    return {
        isReplayMode: false,
        position: 0,
        moves: [],
        originalGameState: null
    };
}

/**
 * Check if can navigate to previous move
 */
export function canNavigatePrevious(replayState: ReplayState): boolean {
    return replayState.isReplayMode && replayState.position > 0;
}

/**
 * Check if can navigate to next move
 */
export function canNavigateNext(replayState: ReplayState): boolean {
    return replayState.isReplayMode && replayState.position < replayState.moves.length;
}

/**
 * Get next position in replay
 */
export function getNextPosition(currentPosition: number, maxMoves: number): number {
    return Math.min(currentPosition + 1, maxMoves);
}

/**
 * Get previous position in replay
 */
export function getPreviousPosition(currentPosition: number): number {
    return Math.max(currentPosition - 1, 0);
}

/**
 * Get position for start of game
 */
export function getStartPosition(): number {
    return 0;
}

/**
 * Get position for end of game
 */
export function getEndPosition(totalMoves: number): number {
    return totalMoves;
}

/**
 * Validate replay position
 */
export function isValidReplayPosition(position: number, totalMoves: number): boolean {
    return position >= 0 && position <= totalMoves;
}

/**
 * Get current move description for display
 */
export function getCurrentMoveDescription(
    position: number,
    moves: LiveGameMove[]
): string {
    if (position === 0) {
        return 'Start position';
    } else if (position === moves.length) {
        return 'Final position';
    } else {
        const currentMove = moves[position - 1];
        return `Move ${position}: ${currentMove.notation}`;
    }
}

/**
 * Calculate replay progress percentage
 */
export function getReplayProgress(position: number, totalMoves: number): number {
    if (totalMoves === 0) return 0;
    return Math.round((position / totalMoves) * 100);
}
