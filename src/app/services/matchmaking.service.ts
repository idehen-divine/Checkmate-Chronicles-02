import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
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
export type GameMode = 'quick-match' | 'tournament' | 'custom' | 'challenge' | 'ranked' | 'casual';

// Time control types for quick matches
export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

export type QueueStatus = 'waiting' | 'matching' | 'matched' | 'cancelled';

@Injectable({
    providedIn: 'root'
})
export class MatchmakingService {
    private matchFoundSubject = new BehaviorSubject<string | null>(null);
    public matchFound$ = this.matchFoundSubject.asObservable();

    private queueStatusSubject = new BehaviorSubject<boolean>(false);
    public inQueue$ = this.queueStatusSubject.asObservable();

    private queueSubscription: any;

    constructor(private supabaseService: SupabaseService) { }

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

        // Ensure user profile exists
        let { data: userProfile, error: profileError } = await this.supabaseService.getUserProfile(user.id);

        if (profileError && profileError.code === 'PGRST116') {
            // User profile doesn't exist, create it
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

            userProfile = createdProfile;
        } else if (profileError) {
            console.error('❌ Error getting user profile:', profileError);
            throw profileError;
        }

        // Update online status
        await this.supabaseService.updateUserProfile(user.id, {
            is_online: true,
            last_seen_at: new Date().toISOString(),
            last_seen_method: 'joining_queue'
        });

        // Remove existing queue entry for this user
        await this.supabaseService.leaveMatchmakingQueue(user.id);

        // Add to queue
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

        // Show current queue status for debugging
        await this.getQueueStatus();

        // Start looking for opponents
        this.startMatchmaking(user.id, userProfile?.elo || 1200, gameType);
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

        // Stop matchmaking subscription
        if (this.queueSubscription) {
            this.queueSubscription.unsubscribe();
            this.queueSubscription = null;
        }
    }

    private async startMatchmaking(userId: string, userElo: number, gameType: GameMode): Promise<void> {
        console.log(`🔍 Starting matchmaking for user ${userId} (ELO: ${userElo}, Game Type: ${gameType})`);

        // Subscribe to queue changes
        this.queueSubscription = this.supabaseService.subscribeToMatchmakingQueue((payload) => {
            console.log('Queue changed:', payload);
            this.checkForMatch(userId, userElo, gameType);
        });

        // Initial check for existing matches
        await this.checkForMatch(userId, userElo, gameType);
    }

    private async checkForMatch(userId: string, userElo: number, gameType: GameMode): Promise<void> {
        console.log(`🔍 Checking for match for user ${userId}...`);

        const { data: queueEntries, error } = await this.supabaseService.getMatchmakingQueue();

        if (error || !queueEntries) {
            console.error('Error fetching queue:', error);
            return;
        }

        // Filter for same game type and exclude current user
        const potentialOpponents = queueEntries.filter(entry =>
            entry.game_type === gameType &&
            entry.player_id !== userId &&
            entry.status === 'waiting'
        );

        console.log(`Found ${potentialOpponents.length} potential opponents`);

        if (potentialOpponents.length === 0) {
            console.log('No opponents found, waiting for more players...');
            return;
        }

        // Find best match based on ELO (simplified matching)
        const bestMatch = potentialOpponents.reduce((best, current) => {
            // For now, just take the first available opponent
            // In a real system, you'd implement ELO-based matching
            return best || current;
        }, null as any);

        if (bestMatch) {
            console.log(`🎯 Found match: ${userId} vs ${bestMatch.player_id}`);
            await this.createGame(userId, bestMatch.player_id, gameType);
        }
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
                    gameStarted: false
                }
            };

            const { data: game, error } = await this.supabaseService.createGame(gameData);

            if (error || !game) {
                console.error('❌ Error creating game:', error);
                throw error || new Error('Failed to create game');
            }

            // Remove both players from queue
            await this.supabaseService.leaveMatchmakingQueue(player1Id);
            await this.supabaseService.leaveMatchmakingQueue(player2Id);

            console.log(`✅ Game created successfully: ${game.id}`);

            // Notify both players
            this.matchFoundSubject.next(game.id);

            // Update queue status
            this.queueStatusSubject.next(false);

        } catch (error) {
            console.error('❌ Error in createGame:', error);
            throw error;
        }
    }

    // Get default time control in minutes for different game modes
    private getDefaultTimeControlForGameMode(gameMode: GameMode): number {
        switch (gameMode) {
            case 'quick-match':
                return 10; // 10 minutes default for quick matches
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
        const { data: players, error } = await this.supabaseService.db
            .from('users')
            .select('id, username, avatar_url, elo, is_online, wins, losses, draws, last_seen_at')
            .eq('is_online', true)
            .order('elo', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching online players:', error);
            return [];
        }

        return players || [];
    }

    // Update user's online status
    async updateOnlineStatus(isOnline: boolean): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        const { error } = await this.supabaseService.updateUserProfile(user.id, {
            is_online: isOnline,
            last_seen_at: new Date().toISOString(),
            last_seen_method: isOnline ? 'active' : 'offline'
        });

        if (error) {
            console.error('Error updating online status:', error);
        }
    }

    // Subscribe to match found events
    subscribeToMatchFound(callback: (gameId: string) => void): Subscription {
        return this.matchFound$.subscribe(gameId => {
            if (gameId) {
                callback(gameId);
            }
        });
    }

    // Clean up subscriptions
    cleanup(): void {
        if (this.queueSubscription) {
            this.queueSubscription.unsubscribe();
            this.queueSubscription = null;
        }
    }
} 