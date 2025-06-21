/**
 * Pure utility functions for notification messages
 * These functions prepare notification configurations without Angular dependencies
 */

export interface ToastConfig {
    message: string;
    duration: number;
    position: 'top' | 'middle' | 'bottom';
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface AlertConfig {
    header: string;
    message: string;
    buttons: Array<{
        text: string;
        role?: string;
        handler?: () => void;
    }>;
}

/**
 * Create toast configuration for different message types
 */
export function createToastConfig(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 2000
): ToastConfig {
    const colorMap = {
        info: 'primary',
        success: 'success',
        warning: 'warning',
        error: 'danger'
    } as const;

    return {
        message,
        duration,
        position: 'top',
        color: colorMap[type]
    };
}

/**
 * Create alert configuration for game events
 */
export function createGameEndAlert(
    title: string,
    message: string,
    onViewHistory?: () => void,
    onBackToLobby?: () => void
): AlertConfig {
    return {
        header: title,
        message,
        buttons: [
            {
                text: 'View Game History',
                handler: onViewHistory || (() => { })
            },
            {
                text: 'Back to Lobby',
                handler: onBackToLobby || (() => { })
            }
        ]
    };
}

/**
 * Create confirmation alert for destructive actions
 */
export function createConfirmationAlert(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
): AlertConfig {
    return {
        header: title,
        message,
        buttons: [
            {
                text: cancelText,
                role: 'cancel'
            },
            {
                text: confirmText,
                handler: onConfirm
            }
        ]
    };
}

/**
 * Standard game notification messages
 */
export const GAME_MESSAGES = {
    MOVE_CANCELLED: 'Move cancelled',
    INVALID_MOVE: 'Invalid move!',
    NO_MOVES_AVAILABLE: 'No valid moves available for this piece',
    UNDO_SUCCESS: 'Move undone successfully!',
    REDO_SUCCESS: 'Move redone successfully!',
    NO_MOVES_TO_UNDO: 'No moves to undo!',
    NO_MOVES_TO_REDO: 'No moves to redo!',
    CANNOT_UNDO: 'Cannot undo: Next player has already made changes!',
    REPLAY_ONLY_AFTER_GAME: 'Replay is only available after the game ends!',
    NO_MOVES_TO_REPLAY: 'No moves to replay!',
    ENTERED_REPLAY_MODE: 'Entered replay mode - Use controls to navigate',
    EXITED_REPLAY_MODE: 'Exited replay mode',
    START_POSITION: 'Start position',
    FINAL_POSITION: 'Final position',
    HINTS_NOT_AVAILABLE: 'Hints are not available when the game is over!',
    CHAT_COMING_SOON: 'Chat functionality coming soon!'
} as const;
