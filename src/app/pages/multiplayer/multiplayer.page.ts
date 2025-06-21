import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
    personAdd,
    gameController,
    trophy,
    refresh,
    checkmark,
    close,
    time,
    people
} from 'ionicons/icons';
import { HeaderToolbarComponent } from 'src/app/components/navigation/header-toolbar/header-toolbar.component';
import { SupabaseService } from '../../services/supabase.service';
import { MatchmakingService } from '../../services/matchmaking.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';

export interface OnlinePlayer {
    id: string;
    username: string;
    avatar?: string;
    current_elo: number;
    current_rank_name?: string;
    is_online: boolean;
    games_played: number;
    wins: number;
    losses: number;
    draws: number;
}

export interface GameInvitation {
    id: string;
    from_user_id: string;
    to_user_id: string;
    from_user: OnlinePlayer;
    to_user: OnlinePlayer;
    time_control: {
        initial_time: number;
        increment: number;
    };
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    created_at: string;
    expires_at: string;
}

@Component({
    selector: 'app-multiplayer',
    templateUrl: './multiplayer.page.html',
    styleUrls: ['./multiplayer.page.scss'],
    imports: [CommonModule, IonicModule, HeaderToolbarComponent]
})
export class MultiplayerPage implements OnInit, OnDestroy {
    onlinePlayers: OnlinePlayer[] = [];
    sentInvitations: GameInvitation[] = [];
    receivedInvitations: GameInvitation[] = [];

    isMatchmaking = false;
    matchmakingTime = 0;
    selectedTimeControl = {
        initial_time: 600, // 10 minutes
        increment: 5
    };

    timeControlOptions = [
        { label: '1+0 (Bullet)', initial_time: 60, increment: 0 },
        { label: '3+0 (Blitz)', initial_time: 180, increment: 0 },
        { label: '5+0 (Blitz)', initial_time: 300, increment: 0 },
        { label: '10+0 (Rapid)', initial_time: 600, increment: 0 },
        { label: '15+10 (Rapid)', initial_time: 900, increment: 10 },
        { label: '30+0 (Classical)', initial_time: 1800, increment: 0 }
    ];

    private subscriptions: Subscription[] = [];
    private matchmakingInterval?: number;

    constructor(
        private router: Router,
        private supabaseService: SupabaseService,
        private matchmakingService: MatchmakingService,
        private notificationService: NotificationService,
        private alertController: AlertController,
        private loadingController: LoadingController,
        private toastController: ToastController,
        private changeDetectorRef: ChangeDetectorRef
    ) {
        addIcons({
            personAdd,
            gameController,
            trophy,
            refresh,
            checkmark,
            close,
            time,
            people
        });
    }

    ngOnInit() {
        this.loadOnlinePlayers();
        this.loadInvitations();
        this.setupRealtimeSubscriptions();
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        if (this.matchmakingInterval) {
            clearInterval(this.matchmakingInterval);
        }
        this.stopMatchmaking();
    }

    async loadOnlinePlayers() {
        const loading = await this.loadingController.create({
            message: 'Finding online players...'
        });
        await loading.present();

        try {
            const players = await this.matchmakingService.getOnlinePlayers();
            this.onlinePlayers = players.filter((p: OnlinePlayer) => p.id !== this.supabaseService.user?.id);
            this.changeDetectorRef.detectChanges();
        } catch (error) {
            console.error('Error loading online players:', error);
            this.showToast('Failed to load online players', 'danger');
        } finally {
            await loading.dismiss();
        }
    }

    async loadInvitations() {
        if (!this.supabaseService.user) return;

        try {
            const [sent, received] = await Promise.all([
                this.matchmakingService.getSentInvitations(this.supabaseService.user.id),
                this.matchmakingService.getReceivedInvitations(this.supabaseService.user.id)
            ]);

            this.sentInvitations = sent;
            this.receivedInvitations = received;
            this.changeDetectorRef.detectChanges();
        } catch (error) {
            console.error('Error loading invitations:', error);
        }
    }

    setupRealtimeSubscriptions() {
        if (!this.supabaseService.user) return;

        // Subscribe to invitation updates
        const invitationSub = this.matchmakingService.subscribeToInvitations(
            this.supabaseService.user.id,
            () => this.loadInvitations()
        );

        // Subscribe to online player updates
        const playerSub = this.matchmakingService.subscribeToOnlinePlayers(
            () => this.loadOnlinePlayers()
        );

        this.subscriptions.push(invitationSub, playerSub);
    }

    async startMatchmaking() {
        if (!this.supabaseService.user) return;

        this.isMatchmaking = true;
        this.matchmakingTime = 0;

        // Start matchmaking timer
        this.matchmakingInterval = window.setInterval(() => {
            this.matchmakingTime++;
            this.changeDetectorRef.detectChanges();
        }, 1000);

        try {
            await this.matchmakingService.joinMatchmakingQueue(
                this.supabaseService.user.id,
                this.selectedTimeControl
            );

            // Listen for match found
            const matchSub = this.matchmakingService.subscribeToMatchFound(
                this.supabaseService.user.id,
                async (gameId: string) => {
                    await this.onMatchFound(gameId);
                }
            );

            this.subscriptions.push(matchSub);
        } catch (error) {
            console.error('Error starting matchmaking:', error);
            this.stopMatchmaking();
            this.showToast('Failed to start matchmaking', 'danger');
        }
    }

    async stopMatchmaking() {
        if (!this.supabaseService.user) return;

        this.isMatchmaking = false;
        this.matchmakingTime = 0;

        if (this.matchmakingInterval) {
            clearInterval(this.matchmakingInterval);
            this.matchmakingInterval = undefined;
        }

        try {
            await this.matchmakingService.leaveMatchmakingQueue(this.supabaseService.user.id);
        } catch (error) {
            console.error('Error stopping matchmaking:', error);
        }
    }

    async onMatchFound(gameId: string) {
        this.stopMatchmaking();

        const toast = await this.toastController.create({
            message: 'Match found! Starting game...',
            duration: 2000,
            color: 'success',
            position: 'top'
        });
        await toast.present();

        // Navigate to game
        setTimeout(() => {
            this.router.navigate(['/game', gameId]);
        }, 1000);
    }

    async sendInvitation(player: OnlinePlayer) {
        if (!this.supabaseService.user) return;

        const alert = await this.alertController.create({
            header: `Invite ${player.username}`,
            message: 'Select time control for this game:',
            inputs: this.timeControlOptions.map((option, index) => ({
                name: 'timeControl',
                type: 'radio',
                label: option.label,
                value: index,
                checked: index === 3 // Default to 10+0
            })),
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Send Invitation',
                    handler: async (selectedIndex) => {
                        if (selectedIndex !== undefined) {
                            const timeControl = this.timeControlOptions[selectedIndex];
                            await this.sendGameInvitation(player, {
                                initial_time: timeControl.initial_time,
                                increment: timeControl.increment
                            });
                        }
                    }
                }
            ]
        });

        await alert.present();
    }

    async sendGameInvitation(player: OnlinePlayer, timeControl: { initial_time: number; increment: number }) {
        if (!this.supabaseService.user) return;

        const loading = await this.loadingController.create({
            message: 'Sending invitation...'
        });
        await loading.present();

        try {
            await this.matchmakingService.sendInvitation(
                this.supabaseService.user.id,
                player.id,
                timeControl
            );

            this.showToast(`Invitation sent to ${player.username}`, 'success');
            await this.loadInvitations();
        } catch (error) {
            console.error('Error sending invitation:', error);
            this.showToast('Failed to send invitation', 'danger');
        } finally {
            await loading.dismiss();
        }
    }

    async acceptInvitation(invitation: GameInvitation) {
        const loading = await this.loadingController.create({
            message: 'Accepting invitation...'
        });
        await loading.present();

        try {
            const gameId = await this.matchmakingService.acceptInvitation(invitation.id);

            this.showToast('Invitation accepted! Starting game...', 'success');

            // Navigate to game after a short delay
            setTimeout(() => {
                this.router.navigate(['/game', gameId]);
            }, 1000);
        } catch (error) {
            console.error('Error accepting invitation:', error);
            this.showToast('Failed to accept invitation', 'danger');
        } finally {
            await loading.dismiss();
        }
    }

    async declineInvitation(invitation: GameInvitation) {
        try {
            await this.matchmakingService.declineInvitation(invitation.id);
            this.showToast('Invitation declined', 'medium');
            await this.loadInvitations();
        } catch (error) {
            console.error('Error declining invitation:', error);
            this.showToast('Failed to decline invitation', 'danger');
        }
    }

    async cancelInvitation(invitation: GameInvitation) {
        try {
            await this.matchmakingService.cancelInvitation(invitation.id);
            this.showToast('Invitation cancelled', 'medium');
            await this.loadInvitations();
        } catch (error) {
            console.error('Error cancelling invitation:', error);
            this.showToast('Failed to cancel invitation', 'danger');
        }
    }

    selectTimeControl(timeControl: { initial_time: number; increment: number }) {
        this.selectedTimeControl = timeControl;
    }

    formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getRatingDifference(playerElo: number): string {
        const currentUser = this.supabaseService.user;
        if (!currentUser) return '';

        // This would typically come from user profile, using placeholder
        const userElo = 1200; // TODO: Get from user profile
        const diff = Math.abs(playerElo - userElo);

        if (diff <= 50) return 'Similar';
        if (diff <= 150) return playerElo > userElo ? '+' + (playerElo - userElo) : '-' + (userElo - playerElo);
        return playerElo > userElo ? 'Much Higher' : 'Much Lower';
    }

    private async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
        const toast = await this.toastController.create({
            message,
            duration: 3000,
            color,
            position: 'bottom'
        });
        await toast.present();
    }

    async refreshPlayers() {
        await this.loadOnlinePlayers();
        await this.loadInvitations();
    }
} 