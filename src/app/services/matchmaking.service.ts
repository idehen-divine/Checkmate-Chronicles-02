import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { Database } from '../types';

export interface OnlinePlayer {
    id: string;
    username: string;
    avatar_url?: string;
    elo: number;
    is_online: boolean;
    wins: number;
    losses: number;
    draws: number;
    last_seen_at?: string;
}

// Game mode types - can be extended for different game modes
export type GameMode = 'quick-match' | 'quick-match-ranked' | 'quick-match-unranked' | 'tournament' | 'custom' | 'challenge' | 'ranked' | 'casual';

// Time control types for quick matches
export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

export type QueueStatus = 'waiting' | 'matching' | 'matched' | 'cancelled';

export type LobbyStatus = 'waiting_for_opponent' | 'both_in_lobby' | 'ready' | 'countdown' | 'starting';

export interface MatchmakingState {
    status: QueueStatus;
    gameId?: string;
    lobbyStatus?: LobbyStatus;
    opponentReady?: boolean;
    currentUserReady?: boolean;
    countdown?: number;
}

@Injectable({
    providedIn: 'root'
})
export class MatchmakingService {
    private matchmakingStateSubject = new BehaviorSubject<MatchmakingState>({ status: 'waiting' });
    public matchmakingState$ = this.matchmakingStateSubject.asObservable();

    private queueStatusSubject = new BehaviorSubject<boolean>(false);
    public inQueue$ = this.queueStatusSubject.asObservable();

    private pollingSubscription?: Subscription;
    private lobbyPollingSubscription?: Subscription;
    private countdownSubscription?: Subscription;
    private currentGameType?: GameMode;
    private currentUserId?: string;
    private currentGameId?: string;
    private isCountdownActive = false;

    constructor(
        private supabaseService: SupabaseService,
        private authService: AuthService
    ) { }

    // Check if user is in queue
    async isUserInQueue(userId?: string): Promise<boolean> {
        const user = this.supabaseService.user;
        const targetUserId = userId || user?.id;
        if (!targetUserId) return false;

        const { data, error } = await this.supabaseService.db
            .from('matchmaking_queue')
            .select('id')
            .eq('player_id', targetUserId)
            .single();

        return !error && !!data;
    }

    // Get current queue status for debugging
    async getQueueStatus(): Promise<void> {
        const { data: queueEntries, error } = await this.supabaseService.getMatchmakingQueue();

        if (error) {
            console.error('❌ Error fetching queue status:', error);
        } else {
            console.log(`📋 Current matchmaking queue (${queueEntries?.length || 0} users):`, queueEntries);
        }
    }

    // Join matchmaking queue
    async joinMatchmakingQueue(gameType: GameMode): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) throw new Error('User not authenticated');

        console.log(`👤 User joining ${gameType} queue: ${user.id}`);
        this.currentUserId = user.id;
        this.currentGameType = gameType;

        // Ensure user profile exists - use safe operation that handles missing profiles
        const { data: userProfile, error: profileError } = await this.authService.safeUserOperation(
            () => this.supabaseService.getUserProfile(user.id),
            'matchmaking_get_user_profile'
        );

        if (profileError) {
            console.error('❌ Error getting user profile or user was logged out:', profileError);
            throw profileError;
        }

        // If profile is still null after safe operation, create it
        let finalUserProfile = userProfile;
        if (!finalUserProfile) {
            console.log(`🆕 Creating new user profile for ${user.id}...`);
            const newProfile = {
                id: user.id,
                username: user.user_metadata?.['name'] || user.email?.split('@')[0] || 'Player',
                elo: 1200,
                wins: 0,
                losses: 0,
                draws: 0,
                is_online: true,
                last_seen_method: 'joining_queue'
            };

            const { data: createdProfile, error: createError } = await this.supabaseService.createUserProfile(newProfile);

            if (createError) {
                console.error('❌ Error creating user profile:', createError);
                throw new Error('Failed to create user profile');
            }

            finalUserProfile = createdProfile;
        }

        // Update online status
        await this.supabaseService.updateUserProfile(user.id, {
            is_online: true,
            last_seen_at: new Date().toISOString(),
            last_seen_method: 'joining_queue'
        });

        // Remove existing queue entry for this user
        await this.supabaseService.leaveMatchmakingQueue(user.id);

        // Add to queue with 'waiting' status
        const { error } = await this.supabaseService.joinMatchmakingQueue({
            player_id: user.id,
            game_type: gameType,
            status: 'waiting'
        });

        if (error) {
            console.error('Error joining matchmaking queue:', error);
            throw error;
        }

        console.log(`✅ Successfully joined ${gameType} queue!`);
        this.queueStatusSubject.next(true);
        this.matchmakingStateSubject.next({ status: 'waiting' });

        // Show current queue status for debugging
        await this.getQueueStatus();

        // Start polling for matches every 3 seconds
        this.startPolling();
    }

    // Leave matchmaking queue
    async leaveMatchmakingQueue(): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        console.log(`👤 User leaving queue: ${user.id}`);

        const { error } = await this.supabaseService.leaveMatchmakingQueue(user.id);

        if (error) {
            console.error('Error leaving matchmaking queue:', error);
        } else {
            console.log('✅ Successfully left matchmaking queue');
        }

        this.queueStatusSubject.next(false);
        this.matchmakingStateSubject.next({ status: 'cancelled' });
        this.stopPolling();
        this.stopLobbyPolling();
        this.stopCountdown();
    }

    // Start polling for matches every 3 seconds
    private startPolling(): void {
        this.stopPolling(); // Stop any existing polling

        this.pollingSubscription = interval(3000).subscribe(async () => {
            if (this.currentUserId && this.currentGameType) {
                await this.checkForMatches();
            }
        });

        // Initial check
        if (this.currentUserId && this.currentGameType) {
            this.checkForMatches();
        }
    }

    private stopPolling(): void {
        if (this.pollingSubscription) {
            this.pollingSubscription.unsubscribe();
            this.pollingSubscription = undefined;
        }
    }

    // Check for matches and handle the matchmaking flow
    private async checkForMatches(): Promise<void> {
        if (!this.currentUserId || !this.currentGameType) return;

        console.log(`🔍 Checking for matches for user ${this.currentUserId}...`);

        // First, check if we're already matched
        const { data: currentEntry, error: currentError } = await this.supabaseService.db
            .from('matchmaking_queue')
            .select('*')
            .eq('player_id', this.currentUserId)
            .single();

        if (currentError || !currentEntry) {
            console.log('User no longer in queue, stopping polling');
            this.stopPolling();
            return;
        }

        // If we're already matched, check for game creation
        if (currentEntry.status === 'matched') {
            await this.handleMatchedState();
            return;
        }

        // If we're in matching state, wait for the match to complete
        if (currentEntry.status === 'matching') {
            const matchingWith = currentEntry.matching_with_id;
            console.log(`⏳ Currently in matching state with player ${matchingWith}, waiting...`);
            return;
        }

        // Look for potential opponents
        const { data: queueEntries, error } = await this.supabaseService.getMatchmakingQueue();

        if (error || !queueEntries) {
            console.error('Error fetching queue:', error);
            return;
        }

        // Filter for same game type and exclude current user
        const potentialOpponents = queueEntries.filter(entry =>
            entry.game_type === this.currentGameType &&
            entry.player_id !== this.currentUserId &&
            entry.status === 'waiting'
        );

        console.log(`Found ${potentialOpponents.length} potential opponents`);

        if (potentialOpponents.length === 0) {
            console.log('No opponents found, continuing to wait...');
            return;
        }

        // Get user profiles for ELO compatibility check
        const userProfile = await this.supabaseService.getUserProfile(this.currentUserId);
        if (!userProfile) {
            console.error('Could not get user profile');
            return;
        }

        // Find compatible opponent (ELO within ±200)
        const compatibleOpponent = potentialOpponents.find(opponent => {
            // For now, we'll get the opponent's ELO from their profile
            // In a real system, you might cache this or include it in the queue entry
            return true; // Simplified for now - we'll implement ELO checking later
        });

        if (!compatibleOpponent) {
            console.log('No compatible opponents found (ELO range), continuing to wait...');
            return;
        }

        console.log(`🎯 Found compatible opponent: ${compatibleOpponent.player_id}`);

        // Attempt to lock both players in 'matching' state
        await this.lockPlayersForMatching(this.currentUserId, compatibleOpponent.player_id);
    }

    // Lock both players in matching state to prevent other matches
    private async lockPlayersForMatching(player1Id: string, player2Id: string): Promise<void> {
        try {
            console.log(`🔒 Locking players for matching: ${player1Id} vs ${player2Id}`);

            // Determine who should create the game (player with smaller ID to avoid race conditions)
            const shouldCreateGame = player1Id < player2Id ? player1Id === this.currentUserId : player2Id === this.currentUserId;

            if (!shouldCreateGame) {
                console.log('⏳ Waiting for opponent to create the game');
                return; // Let the other player handle the game creation
            }

            console.log('🎮 This player will create the game');

            // Use atomic function to update both players to 'matching' status
            const { data: updateResults, error } = await this.supabaseService.db
                .rpc('match_players', {
                    p_player1_id: player1Id,
                    p_player2_id: player2Id
                });

            if (error) {
                console.error('Failed to lock players for matching:', error);
                // Fallback to individual updates if RPC fails
                await this.fallbackLockPlayers(player1Id, player2Id);
                return;
            }

            if (!updateResults || updateResults.length !== 2) {
                console.log('One or both players no longer available for matching');
                return;
            }

            console.log('✅ Players locked successfully, creating game...');

            // Create the game
            await this.createGame(player1Id, player2Id, this.currentGameType!);

        } catch (error) {
            console.error('Error in lockPlayersForMatching:', error);
            // Try fallback approach
            await this.fallbackLockPlayers(player1Id, player2Id);
        }
    }

    // Fallback method for locking players if RPC fails
    private async fallbackLockPlayers(player1Id: string, player2Id: string): Promise<void> {
        console.log('🔄 Using fallback locking method');

        // Update both players to 'matching' status with matching_with_id
        const [result1, result2] = await Promise.all([
            this.supabaseService.db
                .from('matchmaking_queue')
                .update({
                    status: 'matching',
                    matching_with_id: player2Id,
                    updated_at: new Date().toISOString()
                })
                .eq('player_id', player1Id)
                .eq('status', 'waiting'),
            this.supabaseService.db
                .from('matchmaking_queue')
                .update({
                    status: 'matching',
                    matching_with_id: player1Id,
                    updated_at: new Date().toISOString()
                })
                .eq('player_id', player2Id)
                .eq('status', 'waiting')
        ]);

        if (result1.error || result2.error) {
            console.error('Fallback locking failed:', result1.error || result2.error);
            return;
        }

        // Check if both updates were successful (affected rows > 0)
        if (result1.count === 0 || result2.count === 0) {
            console.log('One or both players no longer in waiting state');
            return;
        }

        console.log('✅ Fallback locking successful, creating game...');
        await this.createGame(player1Id, player2Id, this.currentGameType!);
    }

    // Handle when user is in matched state
    private async handleMatchedState(): Promise<void> {
        console.log('🎮 User is in matched state, looking for game...');

        // Look for a game where this user is a player
        const { data: games, error } = await this.supabaseService.db
            .from('games')
            .select('*')
            .or(`player1_id.eq.${this.currentUserId},player2_id.eq.${this.currentUserId}`)
            .eq('status', 'waiting')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error looking for game:', error);
            return;
        }

        if (games && games.length > 0) {
            const game = games[0];
            console.log(`🎯 Found game: ${game.id}`);

            this.currentGameId = game.id;
            this.matchmakingStateSubject.next({
                status: 'matched',
                gameId: game.id,
                lobbyStatus: 'waiting_for_opponent'
            });

            // Stop queue polling and start lobby polling
            this.stopPolling();
            this.startLobbyPolling();
        }
    }

    // Start polling for lobby updates
    private startLobbyPolling(): void {
        this.stopLobbyPolling(); // Stop any existing polling

        this.lobbyPollingSubscription = interval(2000).subscribe(async () => {
            if (this.currentGameId) {
                await this.checkLobbyStatus();
            }
        });

        // Initial check
        if (this.currentGameId) {
            this.checkLobbyStatus();
        }
    }

    private stopLobbyPolling(): void {
        if (this.lobbyPollingSubscription) {
            this.lobbyPollingSubscription.unsubscribe();
            this.lobbyPollingSubscription = undefined;
        }
    }

    // Check lobby status and ready states
    private async checkLobbyStatus(): Promise<void> {
        if (!this.currentGameId || !this.currentUserId) return;

        // Get game data
        const { data: game, error } = await this.supabaseService.db
            .from('games')
            .select('*')
            .eq('id', this.currentGameId)
            .single();

        if (error || !game) {
            console.error('Error getting game data:', error);
            return;
        }

        // Check if both players are in lobby (by checking lobby logs)
        const { data: lobbyLogs, error: lobbyError } = await this.supabaseService.db
            .from('game_lobby_logs')
            .select('player_id, event')
            .eq('game_id', this.currentGameId)
            .eq('event', 'entered_lobby');

        if (lobbyError) {
            console.error('Error getting lobby logs:', lobbyError);
            return;
        }

        const playersInLobby = lobbyLogs?.map(log => log.player_id) || [];
        const bothInLobby = playersInLobby.includes(game.player1_id) && playersInLobby.includes(game.player2_id);

        if (bothInLobby) {
            // Check ready states from game meta
            const meta = game.meta as any || {};
            const player1Ready = meta.player1Ready || false;
            const player2Ready = meta.player2Ready || false;

            const currentUserReady = this.currentUserId === game.player1_id ? player1Ready : player2Ready;
            const opponentReady = this.currentUserId === game.player1_id ? player2Ready : player1Ready;

            if (player1Ready && player2Ready) {
                // Both ready, start countdown (only if not already active)
                if (!this.isCountdownActive) {
                    this.matchmakingStateSubject.next({
                        status: 'matched',
                        gameId: this.currentGameId,
                        lobbyStatus: 'countdown',
                        currentUserReady: true,
                        opponentReady: true
                    });
                    this.startCountdown();
                }
            } else {
                // At least one not ready
                this.matchmakingStateSubject.next({
                    status: 'matched',
                    gameId: this.currentGameId,
                    lobbyStatus: 'both_in_lobby',
                    currentUserReady,
                    opponentReady
                });
            }
        } else {
            // Still waiting for opponent
            this.matchmakingStateSubject.next({
                status: 'matched',
                gameId: this.currentGameId,
                lobbyStatus: 'waiting_for_opponent'
            });
        }
    }

    // Set player ready state
    async setPlayerReady(ready: boolean): Promise<void> {
        if (!this.currentGameId || !this.currentUserId) return;

        const { data: game, error: gameError } = await this.supabaseService.db
            .from('games')
            .select('*')
            .eq('id', this.currentGameId)
            .single();

        if (gameError || !game) {
            console.error('Error getting game for ready state:', gameError);
            return;
        }

        const meta = (game.meta as any) || {};
        const readyField = this.currentUserId === game.player1_id ? 'player1Ready' : 'player2Ready';

        meta[readyField] = ready;

        const { error } = await this.supabaseService.db
            .from('games')
            .update({ meta })
            .eq('id', this.currentGameId);

        if (error) {
            console.error('Error updating ready state:', error);
        } else {
            console.log(`✅ Player ready state updated: ${ready}`);
        }
    }

    // Start 5-second countdown
    private startCountdown(): void {
        this.stopCountdown();
        this.stopLobbyPolling(); // Stop lobby polling during countdown
        this.isCountdownActive = true;

        console.log('🕐 Starting 5-second countdown...');

        let countdown = 5;
        this.matchmakingStateSubject.next({
            status: 'matched',
            gameId: this.currentGameId,
            lobbyStatus: 'countdown',
            countdown
        });

        this.countdownSubscription = interval(1000).subscribe(() => {
            countdown--;
            console.log(`⏰ Countdown: ${countdown}`);

            if (countdown > 0) {
                this.matchmakingStateSubject.next({
                    status: 'matched',
                    gameId: this.currentGameId,
                    lobbyStatus: 'countdown',
                    countdown
                });
            } else {
                // Countdown finished, start game
                console.log('🚀 Countdown finished, starting game!');
                this.isCountdownActive = false;
                this.startGame();
            }
        });
    }

    private stopCountdown(): void {
        if (this.countdownSubscription) {
            this.countdownSubscription.unsubscribe();
            this.countdownSubscription = undefined;
        }
        this.isCountdownActive = false;
    }

    // Start the actual game
    private async startGame(): Promise<void> {
        if (!this.currentGameId) return;

        console.log('🚀 Starting game!');

        // Update game status to active
        const { error } = await this.supabaseService.db
            .from('games')
            .update({
                status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', this.currentGameId);

        if (error) {
            console.error('Error starting game:', error);
            return;
        }

        // Remove both players from queue
        const { data: game } = await this.supabaseService.db
            .from('games')
            .select('player1_id, player2_id')
            .eq('id', this.currentGameId)
            .single();

        if (game) {
            await this.supabaseService.leaveMatchmakingQueue(game.player1_id);
            await this.supabaseService.leaveMatchmakingQueue(game.player2_id);
        }

        this.matchmakingStateSubject.next({
            status: 'matched',
            gameId: this.currentGameId,
            lobbyStatus: 'starting'
        });

        this.stopLobbyPolling();
        this.stopCountdown();
        this.queueStatusSubject.next(false);

        console.log('✅ Game started successfully!');
    }

    private async createGame(player1Id: string, player2Id: string, gameType: GameMode): Promise<void> {
        console.log(`🎮 Creating game between ${player1Id} and ${player2Id}`);

        try {
            // Create game with metadata including time control
            const gameData = {
                player1_id: player1Id,
                player2_id: player2Id,
                game_type: gameType,
                status: 'waiting' as const,
                meta: {
                    timeControl: this.getDefaultTimeControlForGameMode(gameType),
                    initialTime: this.getDefaultTimeControlForGameMode(gameType) * 60, // Convert to seconds
                    increment: 0,
                    board: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
                    moves: [],
                    turn: 'white',
                    gameStarted: false,
                    player1Ready: false,
                    player2Ready: false
                }
            };

            const { data: game, error } = await this.supabaseService.createGame(gameData);

            if (error || !game) {
                console.error('❌ Error creating game:', error);
                throw error || new Error('Failed to create game');
            }

            // Update both players to 'matched' status using atomic function
            const { data: updateResults, error: updateError } = await this.supabaseService.db
                .rpc('update_players_to_matched', {
                    p_player1_id: player1Id,
                    p_player2_id: player2Id
                });

            if (updateError) {
                console.error('Error updating players to matched status:', updateError);
                // Fallback to individual updates
                const [result1, result2] = await Promise.all([
                    this.supabaseService.db
                        .from('matchmaking_queue')
                        .update({ status: 'matched', updated_at: new Date().toISOString() })
                        .eq('player_id', player1Id),
                    this.supabaseService.db
                        .from('matchmaking_queue')
                        .update({ status: 'matched', updated_at: new Date().toISOString() })
                        .eq('player_id', player2Id)
                ]);

                if (result1.error || result2.error) {
                    console.error('Fallback update also failed:', result1.error || result2.error);
                    throw new Error('Failed to update player statuses');
                }
                console.log('✅ Fallback: Both players updated to matched status');
            } else {
                console.log('✅ Both players updated to matched status atomically');
            }

            console.log(`✅ Game created successfully: ${game.id}`);

        } catch (error) {
            console.error('❌ Error in createGame:', error);
            throw error;
        }
    }

    // Get default time control in minutes for different game modes
    private getDefaultTimeControlForGameMode(gameMode: GameMode): number {
        switch (gameMode) {
            case 'quick-match':
            case 'quick-match-unranked':
                return 10; // 10 minutes default for quick matches
            case 'quick-match-ranked':
                return 15; // 15 minutes for ranked quick matches
            case 'tournament':
                return 15; // 15 minutes for tournament games
            case 'ranked':
                return 10; // 10 minutes for ranked games
            case 'challenge':
                return 10; // 10 minutes for challenges
            case 'custom':
                return 15; // 15 minutes for custom games
            case 'casual':
                return 10; // 10 minutes for casual games
            default:
                return 10; // Default fallback
        }
    }

    // Helper method to get time control from minutes (for backward compatibility)
    getTimeControlFromMinutes(minutes: number): TimeControl {
        if (minutes <= 3) return 'bullet';
        if (minutes <= 10) return 'blitz';
        if (minutes <= 30) return 'rapid';
        return 'classical';
    }

    // Get online players for challenges
    async getOnlinePlayers(): Promise<OnlinePlayer[]> {
        try {
            const result = await this.authService.safeUserOperation(
                () => this.supabaseService.db
                    .from('users')
                    .select('id, username, avatar_url, elo, is_online, wins, losses, draws, last_seen_at')
                    .eq('is_online', true)
                    .order('elo', { ascending: false })
                    .limit(50),
                'get_online_players'
            );

            if (result.error) {
                console.error('Error fetching online players:', result.error);
                return [];
            }

            return (result.data as any) || [];
        } catch (error) {
            console.error('Error fetching online players:', error);
            return [];
        }
    }

    // Update user's online status
    async updateOnlineStatus(isOnline: boolean): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        try {
            const result = await this.authService.safeUserOperation(
                () => this.supabaseService.updateUserProfile(user.id, {
                    is_online: isOnline,
                    last_seen_at: new Date().toISOString(),
                    last_seen_method: isOnline ? 'active' : 'offline'
                }),
                'update_online_status'
            );

            if (result.error) {
                console.error('Error updating online status:', result.error);
            }
        } catch (error) {
            console.error('Error updating online status:', error);
        }
    }

    // Clean up subscriptions
    cleanup(): void {
        this.stopPolling();
        this.stopLobbyPolling();
        this.stopCountdown();
    }
} 