import { Injectable } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import * as NotificationUtils from '../utils/notification.util';
import * as ReplayUtils from '../utils/chess-replay.util';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    constructor(
        private toastController: ToastController,
        private alertController: AlertController
    ) { }

    /**
     * Show a toast notification
     */
    async showToast(
        message: string,
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        duration: number = 2000
    ): Promise<void> {
        const config = NotificationUtils.createToastConfig(message, type, duration);

        const toast = await this.toastController.create({
            message: config.message,
            duration: config.duration,
            position: config.position,
            color: config.color
        });

        await toast.present();
    }

    /**
     * Show game-specific toast messages
     */
    async showGameMessage(messageKey: keyof typeof NotificationUtils.GAME_MESSAGES): Promise<void> {
        const message = NotificationUtils.GAME_MESSAGES[messageKey];
        await this.showToast(message, 'info');
    }

    /**
     * Show move feedback toast
     */
    async showMoveToast(moveNotation: string): Promise<void> {
        await this.showToast(`Move: ${moveNotation}`, 'success');
    }

    /**
     * Show available moves toast
     */
    async showAvailableMovesToast(moveCount: number): Promise<void> {
        if (moveCount === 0) {
            await this.showGameMessage('NO_MOVES_AVAILABLE');
        } else {
            await this.showToast(`${moveCount} moves available`, 'info');
        }
    }    /**
     * Show replay position toast
     */
    async showReplayPositionToast(position: number, moves: any[]): Promise<void> {
        const description = ReplayUtils.getCurrentMoveDescription(position, moves);
        await this.showToast(description, 'info');
    }

    /**
     * Show hint toast
     */
    async showHintToast(hint: string): Promise<void> {
        await this.showToast(`Consider: ${hint}`, 'success', 3000);
    }

    /**
     * Show game end alert
     */
    async showGameEndAlert(
        title: string,
        message: string,
        onViewHistory?: () => void,
        onBackToLobby?: () => void
    ): Promise<void> {
        const config = NotificationUtils.createGameEndAlert(
            title,
            message,
            onViewHistory,
            onBackToLobby
        );

        const alert = await this.alertController.create({
            header: config.header,
            message: config.message,
            buttons: config.buttons
        });

        await alert.present();
    }

    /**
     * Show confirmation alert
     */
    async showConfirmationAlert(
        title: string,
        message: string,
        onConfirm: () => void,
        confirmText: string = 'Confirm',
        cancelText: string = 'Cancel'
    ): Promise<void> {
        const config = NotificationUtils.createConfirmationAlert(
            title,
            message,
            onConfirm,
            confirmText,
            cancelText
        );

        const alert = await this.alertController.create({
            header: config.header,
            message: config.message,
            buttons: config.buttons
        });

        await alert.present();
    }

    /**
     * Show abort game confirmation
     */
    async showAbortGameAlert(onConfirm: () => void): Promise<void> {
        await this.showConfirmationAlert(
            'Abort Game',
            'Are you sure you want to abort this game? This action cannot be undone.',
            onConfirm,
            'Abort Game',
            'Cancel'
        );
    }
}
