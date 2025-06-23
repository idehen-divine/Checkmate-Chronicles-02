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
	close,
	wifiOutline
} from 'ionicons/icons';
import { HeaderToolbarComponent } from 'src/app/components/navigation/header-toolbar/header-toolbar.component';
import { LobbyToolbarComponent } from 'src/app/components/navigation/game-toolbar/game-toolbar.component';
import { SupabaseService, MatchmakingService } from '../../services';
import type { TimeControl, MatchmakingState, LobbyStatus } from '../../services/matchmaking.service';
import { Subscription } from 'rxjs';

export interface Player {
	id: string;
	username: string;
	avatar?: string;
	ready: boolean;
	isHost: boolean;
	elo?: number;
}

@Component({
	selector: 'app-quick-play',
	templateUrl: './quick-play.page.html',
	styleUrls: ['./quick-play.page.scss'],
	imports: [CommonModule, IonicModule, HeaderToolbarComponent, LobbyToolbarComponent, FormsModule]
})
export class QuickPlayPage implements OnInit, OnDestroy {
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

	// Matchmaking state
	matchmakingState: MatchmakingState = { status: 'waiting' };
	matchmakingDots = '';
	chatVisible = false;

	// Subscriptions
	private matchmakingSubscription?: Subscription;

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
			close,
			wifiOutline
		});
	}

	async ngOnInit() {
		// Read query parameters
		this.route.queryParams.subscribe(params => {
			this.gameMode = params['mode'] === 'ranked' ? 'ranked' : 'unranked';
			this.gameName = this.gameMode === 'ranked' ? 'Ranked Match' : 'Quick Match';
		});

		await this.initializePlayer();
		this.startRealMatchmaking();
	}

	ngOnDestroy() {
		this.cleanup();
	}

	private cleanup() {
		// Log lobby exit if we're in a game
		if (this.matchmakingState.gameId && this.matchmakingState.status === 'matched') {
			this.leaveLobby(this.matchmakingState.gameId);
		}

		// Leave matchmaking queue
		this.matchmakingService.leaveMatchmakingQueue();

		// Unsubscribe from observables
		if (this.matchmakingSubscription) {
			this.matchmakingSubscription.unsubscribe();
		}
	}

	private async initializePlayer() {
		if (this.supabaseService.user) {
			// Get user's current ELO from the database
			const { data: userData, error } = await this.supabaseService.db
				.from('users')
				.select('username, elo')
				.eq('id', this.supabaseService.user.id)
				.single();

			this.currentPlayer = {
				id: this.supabaseService.user.id,
				username: userData?.username || this.supabaseService.user.user_metadata?.['username'] || 'Player',
				avatar: '/assets/images/profile-avatar.png',
				ready: false,
				isHost: false,
				elo: userData?.elo || 1200 // Default to 1200 if no ELO found
			};

			if (error) {
				console.error('Error fetching user ELO:', error);
			}
		}
	}

	private startRealMatchmaking() {
		// Animate the loading dots
		const dotsInterval = setInterval(() => {
			this.matchmakingDots = this.matchmakingDots.length >= 3 ? '' : this.matchmakingDots + '.';
			this.changeDetectorRef.detectChanges();
		}, 500);

		// Subscribe to matchmaking state changes
		this.matchmakingSubscription = this.matchmakingService.matchmakingState$.subscribe(async (state) => {
			console.log('🎮 Matchmaking state changed:', state);
			this.matchmakingState = state;

			// Handle different states
			if (state.status === 'matched' && state.gameId && !this.opponent) {
				clearInterval(dotsInterval);
				await this.handleMatchFound(state.gameId);
			} else if (state.status === 'cancelled') {
				clearInterval(dotsInterval);
				this.showMatchmakingError();
			} else if (state.lobbyStatus === 'starting') {
				// Navigate to game when it's starting
				this.navigateToGameWhenReady();
			}

			// Update opponent ready state if we have an opponent
			if (this.opponent && state.opponentReady !== undefined) {
				this.opponent.ready = state.opponentReady;
			}

			this.changeDetectorRef.detectChanges();
		});

		// Join the matchmaking queue with the appropriate game type based on mode
		const gameType = this.gameMode === 'ranked' ? 'quick-match-ranked' : 'quick-match-unranked';
		this.matchmakingService.joinMatchmakingQueue(gameType as any).catch(error => {
			console.error('Error joining matchmaking queue:', error);
			clearInterval(dotsInterval);
			this.showMatchmakingError();
		});
	}

	private async handleMatchFound(gameId: string) {
		console.log('🎮 Match found! Game ID:', gameId);

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

			// Get player details separately including ELO
			const { data: players, error: playersError } = await this.supabaseService.db
				.from('users')
				.select('id, username, elo')
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
				isHost: !this.isHost,
				elo: opponentData.elo || 1200 // Default to 1200 if no ELO found
			};

			// Enter the lobby (this will be tracked by the service)
			await this.enterLobby(gameId);

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

	private async enterLobby(gameId: string) {
		// Log that this player has entered the lobby
		const { error } = await this.supabaseService.db
			.from('game_lobby_logs')
			.insert({
				game_id: gameId,
				player_id: this.supabaseService.user?.id,
				event: 'entered_lobby'
			});

		if (error) {
			console.error('Error logging lobby entry:', error);
		} else {
			console.log('✅ Entered lobby successfully');
		}
	}

	private async leaveLobby(gameId: string) {
		// Log that this player has left the lobby
		const { error } = await this.supabaseService.db
			.from('game_lobby_logs')
			.insert({
				game_id: gameId,
				player_id: this.supabaseService.user?.id,
				event: 'left_lobby'
			});

		if (error) {
			console.error('Error logging lobby exit:', error);
		} else {
			console.log('✅ Left lobby successfully');
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
					handler: () => {
						this.cleanup();
						this.router.navigate(['/play']);
					}
				}
			]
		});
		await alert.present();
	}

	async toggleReady() {
		if (!this.matchmakingState.gameId || this.matchmakingState.lobbyStatus === 'countdown' || this.matchmakingState.lobbyStatus === 'starting') return;

		const newReadyState = !(this.matchmakingState.currentUserReady || false);

		// Update ready state in the matchmaking service
		await this.matchmakingService.setPlayerReady(newReadyState);

		// Update local UI
		if (this.currentPlayer) {
			this.currentPlayer.ready = newReadyState;
		}

		this.changeDetectorRef.detectChanges();
	}

	private async navigateToGameWhenReady() {
		if (this.matchmakingState.lobbyStatus === 'starting') {
			this.navigateToGame();
		}
	}

	private navigateToGame() {
		if (!this.matchmakingState.gameId) {
			console.error('No game ID available for navigation');
			return;
		}

		console.log('🚀 Navigating to game:', this.matchmakingState.gameId);
		// Navigate to the actual game with the real game ID
		this.router.navigate(['/game', this.matchmakingState.gameId]);
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
		const { status, lobbyStatus, currentUserReady, opponentReady, countdown, opponentDisconnected } = this.matchmakingState;

		if (status === 'waiting') {
			return `Finding match${this.matchmakingDots}`;
		}

		if (lobbyStatus === 'opponent_disconnected' || opponentDisconnected) {
			if (countdown !== undefined && countdown > 0) {
				return `Opponent disconnected. Returning to queue in ${countdown}s...`;
			}
			return 'Opponent disconnected. Waiting for reconnection...';
		}

		if (lobbyStatus === 'waiting_for_opponent') {
			return 'Waiting for opponent to join lobby...';
		}

		if (lobbyStatus === 'countdown' && countdown !== undefined) {
			return `Game starting in ${countdown}...`;
		}

		if (lobbyStatus === 'starting') {
			return 'Starting game...';
		}

		if (currentUserReady && opponentReady) {
			return 'Both players ready! Starting soon...';
		}

		if (currentUserReady) {
			return 'You are ready. Waiting for opponent...';
		}

		if (opponentReady) {
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
		const { status, lobbyStatus, opponentDisconnected } = this.matchmakingState;
		return status === 'matched' &&
			lobbyStatus !== 'waiting_for_opponent' &&
			lobbyStatus !== 'opponent_disconnected' &&
			lobbyStatus !== 'countdown' &&
			lobbyStatus !== 'starting' &&
			!opponentDisconnected;
	}

	// Add method to handle back navigation
	async onBackPressed() {
		if (this.matchmakingState.status === 'waiting') {
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
