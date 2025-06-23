import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, PopoverController, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
	chatbubble,
	ellipsisVertical,
	bulb,
	time,
	settings,
	person,
	checkmark,
	play,
	pencil,
	close
} from 'ionicons/icons';
import { HeaderToolbarComponent } from 'src/app/components/navigation/header-toolbar/header-toolbar.component';
import { LobbyToolbarComponent } from 'src/app/components/navigation/game-toolbar/game-toolbar.component';
import { SupabaseService, MatchmakingService } from '../../services';
import type { TimeControl } from '../../services/matchmaking.service';
import { Subscription } from 'rxjs';

export interface Player {
	id: string;
	username: string;
	avatar?: string;
	ready: boolean;
	isHost: boolean;
}

@Component({
	selector: 'app-quick-play',
	templateUrl: './quick-play.page.html',
	styleUrls: ['./quick-play.page.scss'],
	imports: [CommonModule, IonicModule, HeaderToolbarComponent, LobbyToolbarComponent, FormsModule]
})
export class QuickPlayPage implements OnInit, OnDestroy {
	// Game states
	gameState: 'finding-match' | 'lobby' | 'starting' = 'finding-match';

	// Game settings (controlled by host)
	gameName = 'Quick-Play';
	gameMinutes = 15;
	hintsEnabled = false;

	// Game mode from query params
	gameMode: 'ranked' | 'unranked' = 'unranked';

	// Players
	currentPlayer: Player | null = null;
	opponent: Player | null = null;
	isHost = false;

	// Game ID from matchmaking
	gameId: string | null = null;

	// UI state
	isReady = false;
	opponentReady = false;
	gameStarting = false;
	matchmakingDots = '';
	chatVisible = false;

	// Subscriptions
	private matchFoundSubscription?: Subscription;
	private queueSubscription?: Subscription;

	constructor(
		private router: Router,
		private route: ActivatedRoute,
		private supabaseService: SupabaseService,
		private matchmakingService: MatchmakingService,
		private alertController: AlertController,
		private popoverController: PopoverController,
		private modalController: ModalController,
		private changeDetectorRef: ChangeDetectorRef
	) {
		addIcons({
			chatbubble,
			ellipsisVertical,
			bulb,
			time,
			settings,
			person,
			checkmark,
			play,
			pencil,
			close
		});
	}

	ngOnInit() {
		// Read query parameters
		this.route.queryParams.subscribe(params => {
			this.gameMode = params['mode'] === 'ranked' ? 'ranked' : 'unranked';
			this.gameName = this.gameMode === 'ranked' ? 'Ranked Match' : 'Quick Match';
		});

		this.initializePlayer();
		this.startRealMatchmaking();
	}

	ngOnDestroy() {
		this.cleanup();
	}

	private cleanup() {
		// Leave matchmaking queue
		this.matchmakingService.leaveMatchmakingQueue();

		// Unsubscribe from observables
		if (this.matchFoundSubscription) {
			this.matchFoundSubscription.unsubscribe();
		}
		if (this.queueSubscription) {
			this.queueSubscription.unsubscribe();
		}
	}

	private initializePlayer() {
		if (this.supabaseService.user) {
			this.currentPlayer = {
				id: this.supabaseService.user.id,
				username: this.supabaseService.user.user_metadata?.['username'] || 'Player',
				avatar: '/assets/images/profile-avatar.png',
				ready: false,
				isHost: false
			};
		}
	}

	private startRealMatchmaking() {
		// Animate the loading dots
		const dotsInterval = setInterval(() => {
			this.matchmakingDots = this.matchmakingDots.length >= 3 ? '' : this.matchmakingDots + '.';
			this.changeDetectorRef.detectChanges();
		}, 500);

		// Subscribe to match found events
		this.matchFoundSubscription = this.matchmakingService.subscribeToMatchFound((gameId: string) => {
			clearInterval(dotsInterval);
			this.onMatchFound(gameId);
		});

		// Join the matchmaking queue with the appropriate game type based on mode
		const gameType = this.gameMode === 'ranked' ? 'quick-match-ranked' : 'quick-match-unranked';
		this.matchmakingService.joinMatchmakingQueue(gameType as any).catch(error => {
			console.error('Error joining matchmaking queue:', error);
			clearInterval(dotsInterval);
			this.showMatchmakingError();
		});

		// Subscribe to queue status
		this.queueSubscription = this.matchmakingService.inQueue$.subscribe(inQueue => {
			if (!inQueue && this.gameState === 'finding-match') {
				// If we're not in queue anymore but still finding match, there might be an error
				clearInterval(dotsInterval);
			}
		});
	}

	private async onMatchFound(gameId: string) {
		console.log('🎮 Match found! Game ID:', gameId);
		// Store the game ID for navigation
		this.gameId = gameId;

		try {
			// Get game details first
			const { data: game, error: gameError } = await this.supabaseService.db
				.from('games')
				.select('*')
				.eq('id', gameId)
				.single();

			if (gameError || !game) {
				console.error('Error loading game details:', gameError);
				this.showMatchmakingError();
				return;
			}

			// Get player details separately
			const { data: players, error: playersError } = await this.supabaseService.db
				.from('users')
				.select('id, username')
				.in('id', [game.player1_id, game.player2_id]);

			if (playersError || !players || players.length !== 2) {
				console.error('Error loading player details:', playersError);
				this.showMatchmakingError();
				return;
			}

			// Map players to game
			const player1 = players.find(p => p.id === game.player1_id);
			const player2 = players.find(p => p.id === game.player2_id);

			const gameWithPlayers = {
				...game,
				player1,
				player2
			};

			console.log('🎯 Game data loaded:', gameWithPlayers);

			// Validate game data
			if (!gameWithPlayers.player1 || !gameWithPlayers.player2) {
				console.error('❌ Invalid game data - missing players:', { player1: gameWithPlayers.player1, player2: gameWithPlayers.player2 });
				this.showMatchmakingError();
				return;
			}

			// Determine who is the opponent
			const currentUserId = this.supabaseService.user?.id;
			let opponentData;

			if (gameWithPlayers.player1.id === currentUserId) {
				opponentData = gameWithPlayers.player2;
				this.isHost = true;
			} else {
				opponentData = gameWithPlayers.player1;
				this.isHost = false;
			}

			console.log('👥 Player assignment:', {
				currentUserId,
				player1: gameWithPlayers.player1,
				player2: gameWithPlayers.player2,
				opponentData,
				isHost: this.isHost
			});

			// Set up current player
			if (this.currentPlayer) {
				this.currentPlayer.isHost = this.isHost;
			}

			// Set up opponent
			this.opponent = {
				id: opponentData.id,
				username: opponentData.username,
				avatar: '/assets/images/profile-avatar-large.png',
				ready: false,
				isHost: !this.isHost
			};

			// Switch to lobby state
			this.gameState = 'lobby';
			this.changeDetectorRef.detectChanges();

			console.log('✅ Lobby setup complete:', {
				currentPlayer: this.currentPlayer,
				opponent: this.opponent,
				isHost: this.isHost
			});

		} catch (error) {
			console.error('Error setting up lobby:', error);
			this.showMatchmakingError();
		}
	}

	private async showMatchmakingError() {
		const alert = await this.alertController.create({
			header: 'Matchmaking Error',
			message: 'Unable to join matchmaking queue. Please try again.',
			buttons: [
				{
					text: 'Retry',
					handler: () => this.startRealMatchmaking()
				},
				{
					text: 'Cancel',
					handler: () => this.router.navigate(['/dashboard'])
				}
			]
		});
		await alert.present();
	}

	async toggleReady() {
		if (this.gameState !== 'lobby' || this.gameStarting) return;

		this.isReady = !this.isReady;
		if (this.currentPlayer) {
			this.currentPlayer.ready = this.isReady;
		}

		// In real implementation, you'd notify the opponent via real-time updates
		// For now, simulate opponent also getting ready after a delay
		if (this.isReady && this.opponent && !this.opponent.ready) {
			setTimeout(() => {
				if (this.opponent) {
					this.opponent.ready = true;
					this.opponentReady = true;
					this.changeDetectorRef.detectChanges();
					this.startGame();
				}
			}, 2000);
		}

		this.changeDetectorRef.detectChanges();
	}

	private async startGame() {
		if (!this.currentPlayer?.ready || !this.opponent?.ready) return;

		this.gameStarting = true;
		this.gameState = 'starting';

		const alert = await this.alertController.create({
			header: 'Starting Game',
			message: 'Game will start in 3 seconds...',
			backdropDismiss: false,
			buttons: []
		});
		await alert.present();

		let countdown = 3;
		const countdownInterval = setInterval(async () => {
			countdown--;
			if (countdown > 0) {
				alert.message = `Game will start in ${countdown} seconds...`;
			} else {
				clearInterval(countdownInterval);
				await alert.dismiss();
				this.navigateToGame();
			}
		}, 1000);
	}

	private navigateToGame() {
		if (!this.gameId) {
			console.error('No game ID available for navigation');
			return;
		}

		console.log('🚀 Navigating to game:', this.gameId);
		// Navigate to the actual game with the real game ID
		this.router.navigate(['/game', this.gameId], {
			queryParams: {
				minutes: this.gameMinutes,
				hints: this.hintsEnabled,
				gameName: this.gameName
			}
		});
	}

	// Bottom Toolbar Actions
	toggleChat() {
		this.chatVisible = !this.chatVisible;
		// TODO: Implement chat panel toggle
		console.log('Chat toggled:', this.chatVisible);
	}

	toggleHints() {
		if (!this.isHost) return;

		this.hintsEnabled = !this.hintsEnabled;
		this.changeDetectorRef.detectChanges();
		// In real implementation, notify opponent of setting change
		console.log('Hints toggled:', this.hintsEnabled);
	}

	async openTimeModal() {
		if (!this.isHost) return;

		// Implementation for time modal would go here
		console.log('Open time modal');
	}

	async openSettingsModal() {
		if (!this.isHost) return;

		// Implementation for settings modal would go here
		console.log('Open settings modal');
	}

	getGameStatus(): string {
		if (this.gameState === 'finding-match') {
			return `Finding match${this.matchmakingDots}`;
		}
		if (this.gameState === 'starting') {
			return 'Starting game...';
		}
		if (this.isReady && this.opponentReady) {
			return 'Both players ready! Starting soon...';
		}
		if (this.isReady) {
			return 'You are ready. Waiting for opponent...';
		}
		if (this.opponentReady) {
			return 'Opponent is ready. Click Ready to start!';
		}
		return 'Click Ready when you are prepared to play!';
	}

	getHostIndicator(): string {
		if (this.isHost) {
			return 'You are the host - you can modify game settings';
		} else {
			return 'You are the guest - host controls game settings';
		}
	}

	canClickReady(): boolean {
		return this.gameState === 'lobby' && !this.gameStarting;
	}

	// Add method to handle back navigation
	async onBackPressed() {
		if (this.gameState === 'finding-match') {
			const alert = await this.alertController.create({
				header: 'Leave Matchmaking?',
				message: 'Are you sure you want to stop looking for a match?',
				buttons: [
					{
						text: 'Cancel',
						role: 'cancel'
					},
					{
						text: 'Leave',
						handler: () => {
							this.cleanup();
							this.router.navigate(['/play']);
						}
					}
				]
			});
			await alert.present();
		} else {
			this.router.navigate(['/play']);
		}
	}

	private getGameTypeFromMinutes(minutes: number): TimeControl {
		if (minutes <= 3) {
			return 'bullet';
		} else if (minutes <= 10) {
			return 'blitz';
		} else if (minutes <= 30) {
			return 'rapid';
		} else {
			return 'classical';
		}
	}
}
