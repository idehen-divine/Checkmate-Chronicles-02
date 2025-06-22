import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

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
    last_seen?: string;
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

export interface MatchmakingQueue {
    id: string;
    user_id: string;
    elo_rating: number;
    time_control: {
        initial_time: number;
        increment: number;
    };
    created_at: string;
}

@Injectable({
    providedIn: 'root'
})
export class MatchmakingService {
    private matchFoundSubject = new BehaviorSubject<string | null>(null);
    public matchFound$ = this.matchFoundSubject.asObservable();

    private queueStatusSubject = new BehaviorSubject<boolean>(false);
    public inQueue$ = this.queueStatusSubject.asObservable();

    constructor(private supabaseService: SupabaseService) { }

    // Check if user is in queue
    async isUserInQueue(userId?: string): Promise<boolean> {
        const user = this.supabaseService.user;
        const targetUserId = userId || user?.id;
        if (!targetUserId) return false;

        const { data, error } = await this.supabaseService.db
            .from('matchmaking_queue')
            .select('id')
            .eq('user_id', targetUserId)
            .single();

        return !error && !!data;
    }

    // Debug: Get all users in queue
    async getQueueStatus(): Promise<void> {
        const { data: queueEntries, error } = await this.supabaseService.db
            .from('matchmaking_queue')
            .select('*');

        if (error) {
            console.error('❌ Error fetching queue status:', error);
        } else {
            console.log(`📋 Current matchmaking queue (${queueEntries?.length || 0} users):`, queueEntries);
        }
    }

    // Join matchmaking queue
    async joinMatchmakingQueue(timeControl: { initial_time: number; increment: number }): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) throw new Error('User not authenticated');

        console.log(`👤 User joining queue: ${user.id}`);

        // Ensure user profile exists
        let { data: userProfile, error: profileError } = await this.supabaseService.getUserProfile(user.id);

        console.log(`📋 User profile check result:`, { userProfile, profileError });

        if (profileError && profileError.code === 'PGRST116') {
            // User profile doesn't exist, create it
            console.log(`🆕 Creating new user profile for ${user.id}...`);
            const newProfile = {
                id: user.id,
                email: user.email || '',
                username: user.user_metadata?.['name'] || user.email?.split('@')[0] || 'Player',
                current_elo: 1200,
                highest_elo: 1200,
                wins: 0,
                losses: 0,
                draws: 0,
                games_played: 0,
                is_online: true
            };

            console.log(`🆕 New profile data:`, newProfile);

            const { data: createdProfile, error: createError } = await this.supabaseService.createUserProfile(newProfile);

            if (createError) {
                console.error('❌ Error creating user profile:', createError);
                throw new Error('Failed to create user profile');
            }

            console.log(`✅ User profile created successfully:`, createdProfile);
            userProfile = createdProfile;
        } else if (profileError) {
            console.error('❌ Error getting user profile:', profileError);
            throw profileError;
        } else {
            console.log(`✅ User profile found:`, userProfile);
        }

        const elo = userProfile?.current_elo || 1200;

        // Update online status
        console.log(`🌐 Setting user ${user.id} as online...`);
        const { error: onlineError } = await this.supabaseService.db
            .from('users')
            .update({
                is_online: true,
                last_seen: new Date().toISOString()
            })
            .eq('id', user.id);

        if (onlineError) {
            console.error('❌ Error setting online status:', onlineError);
        } else {
            console.log(`✅ User set as online successfully`);
        }

        // Remove only THIS user's existing queue entry (not all entries)
        console.log('Clearing this user\'s existing matchmaking queue entry...');
        await this.supabaseService.db
            .from('matchmaking_queue')
            .delete()
            .eq('user_id', user.id);

        // Add to queue
        console.log('Adding user to matchmaking queue...');
        const { error } = await this.supabaseService.db
            .from('matchmaking_queue')
            .insert({
                user_id: user.id,
                elo_rating: elo,
                time_control: timeControl
            });

        if (error) {
            console.error('Error joining matchmaking queue:', error);
            throw error;
        }

        console.log('Successfully joined matchmaking queue!');
        this.queueStatusSubject.next(true);

        // Verify user record exists in database before starting matchmaking
        console.log(`🔍 Verifying user record exists in database...`);
        const { data: verifyUser, error: verifyError } = await this.supabaseService.db
            .from('users')
            .select('id, username, is_online, current_elo')
            .eq('id', user.id)
            .single();

        if (verifyError || !verifyUser) {
            console.error('❌ User verification failed:', verifyError);
            console.error('❌ This will cause matchmaking to fail due to inner join');
        } else {
            console.log(`✅ User record verified:`, verifyUser);
        }

        // Show current queue status for debugging
        await this.getQueueStatus();

        // Start looking for opponents
        this.startMatchmaking(user.id, elo, timeControl);
    }

    // Leave matchmaking queue
    async leaveMatchmakingQueue(): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        const { error } = await this.supabaseService.db
            .from('matchmaking_queue')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            console.error('Error leaving queue:', error);
        } else {
            console.log('Successfully left matchmaking queue');
        }

        this.queueStatusSubject.next(false);
    }

    // Start matchmaking process
    private async startMatchmaking(userId: string, userElo: number, timeControl: any): Promise<void> {
        console.log(`🔍 Starting matchmaking for user ${userId} with ELO ${userElo}...`);

        // First, get all users in queue with basic info
        const { data: allInQueue, error: allQueueError } = await this.supabaseService.db
            .from('matchmaking_queue')
            .select('*');

        console.log(`🔍 ALL users in queue (raw):`, allInQueue);
        console.log(`🔍 User IDs in queue (raw):`, allInQueue?.map(u => u.user_id));

        // Now get user details for all queue users
        if (allInQueue && allInQueue.length > 0) {
            const userIds = allInQueue.map(u => u.user_id);
            console.log(`🔍 Looking up user IDs in users table:`, userIds);
            
            const { data: usersData, error: usersError } = await this.supabaseService.db
                .from('users')
                .select('id, username, is_online, current_elo')
                .in('id', userIds);

            console.log(`🔍 Users table query error:`, usersError);
            console.log(`🔍 Users table data for queue users:`, usersData);
            console.log(`🔍 User IDs found in users table:`, usersData?.map(u => u.id));
            console.log(`🔍 Missing user IDs:`, userIds.filter(id => !usersData?.some(u => u.id === id)));
            
            // Combine queue data with user data
            const queueWithUsers = allInQueue.map(queueEntry => {
                const userData = usersData?.find(u => u.id === queueEntry.user_id);
                return {
                    ...queueEntry,
                    user_data: userData
                };
            });

            console.log(`🔍 Combined queue + user data:`, queueWithUsers);
            console.log(`🔍 Online status of all queue users:`, queueWithUsers.map(u => ({
                user_id: u.user_id,
                username: u.user_data?.username || 'NO_USER_DATA',
                is_online: u.user_data?.is_online || false,
                elo: u.user_data?.current_elo || 'NO_ELO'
            })));
        }

        // Look for opponents with similar ELO (±200 points) who are ONLINE
        // Use a simpler approach: get all potential opponents first, then filter
        const { data: potentialOpponents, error } = await this.supabaseService.db
            .from('matchmaking_queue')
            .select('*')
            .neq('user_id', userId)
            .gte('elo_rating', userElo - 200)
            .lte('elo_rating', userElo + 200)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Error finding potential opponents:', error);
            return;
        }

        console.log(`🔍 Potential opponents (before online filter):`, potentialOpponents);
        console.log(`🔍 Potential opponent user IDs:`, potentialOpponents?.map(o => o.user_id));

        // Now check which of these potential opponents are online
        let onlineOpponents: any[] = [];
        if (potentialOpponents && potentialOpponents.length > 0) {
            const opponentIds = potentialOpponents.map(o => o.user_id);
            console.log(`🔍 Checking online status for opponent IDs:`, opponentIds);
            
            const { data: opponentUsers, error: opponentUsersError } = await this.supabaseService.db
                .from('users')
                .select('id, username, is_online')
                .in('id', opponentIds)
                .eq('is_online', true);

            console.log(`🔍 Online opponents query error:`, opponentUsersError);
            console.log(`🔍 Online users found:`, opponentUsers);
            console.log(`🔍 Online user IDs:`, opponentUsers?.map(u => u.id));

            if (!opponentUsersError && opponentUsers) {
                onlineOpponents = potentialOpponents.filter(opponent =>
                    opponentUsers.some(user => user.id === opponent.user_id)
                );
                console.log(`🔍 Filtered online opponents:`, onlineOpponents);
            } else {
                console.log(`❌ Error or no online users found`);
            }
        }

        console.log(`📊 Found ${onlineOpponents?.length || 0} online opponents:`, onlineOpponents);
        console.log(`📊 Online opponent user IDs:`, onlineOpponents?.map(o => o.user_id));

        if (onlineOpponents && onlineOpponents.length > 0) {
            const opponent = onlineOpponents[0];

            console.log(`🎯 Checking opponent compatibility:`, {
                opponentId: opponent.user_id,
                opponentElo: opponent.elo_rating,
                myTimeControl: timeControl.initial_time,
                opponentTimeControl: opponent.time_control.initial_time
            });

            // Check if time controls are compatible (within 5 minutes)
            const timeDiff = Math.abs(timeControl.initial_time - opponent.time_control.initial_time);
            console.log(`⏱️ Time difference: ${timeDiff} seconds (max 300)`);

            if (timeDiff <= 300) { // 5 minutes tolerance
                console.log('✅ Compatible opponent found! Creating game...');
                await this.createGame(userId, opponent.user_id, timeControl);
                return; // Stop matchmaking after finding a match
            } else {
                console.log('❌ Time controls not compatible, continuing search...');
            }
        } else {
            console.log('⏳ No online opponents found, will retry in 3 seconds...');
        }

        // If no match found, set up a timeout to try again (but only if still in queue)
        setTimeout(async () => {
            // Check if user is still in queue before continuing
            const { data: queueEntry } = await this.supabaseService.db
                .from('matchmaking_queue')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (queueEntry) {
                console.log('🔄 User still in queue, retrying matchmaking...');
                this.startMatchmaking(userId, userElo, timeControl);
            } else {
                console.log('🛑 User no longer in queue, stopping matchmaking');
            }
        }, 3000); // Try again every 3 seconds
    }

    // Create a new game between matched players
    private async createGame(player1Id: string, player2Id: string, timeControl: any): Promise<void> {
        console.log(`🎮 Creating game between ${player1Id} and ${player2Id}...`);
        try {
            const gameId = await this.createGameAndReturnId(player1Id, player2Id, timeControl);
            console.log(`✅ Game created successfully! Game ID: ${gameId}`);
            // Notify both players
            this.matchFoundSubject.next(gameId);
            console.log('📢 Match found notification sent to both players');
        } catch (error) {
            console.error('❌ Error creating game:', error);
        }
    }

    // Create match found notifications
    private async createMatchNotifications(player1Id: string, player2Id: string, gameId: string): Promise<void> {
        const notifications = [
            {
                user_id: player1Id,
                game_id: gameId,
                type: 'match_found',
                read: false
            },
            {
                user_id: player2Id,
                game_id: gameId,
                type: 'match_found',
                read: false
            }
        ];

        await this.supabaseService.db
            .from('match_notifications')
            .insert(notifications);
    }

    // Get online players
    async getOnlinePlayers(): Promise<OnlinePlayer[]> {
        try {
            const { data: players, error } = await this.supabaseService.db
                .from('users')
                .select(`
                    id,
                    username,
                    current_elo,
                    games_played,
                    wins,
                    losses,
                    draws,
                    last_seen,
                    chess_ranks!current_rank_id (
                        display_name
                    )
                `)
                .eq('is_online', true)
                .order('current_elo', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Error fetching online players:', error);
                return [];
            }

            return players?.map((player: any) => ({
                id: player.id,
                username: player.username,
                avatar: '/assets/images/profile-avatar.png',
                current_elo: player.current_elo,
                current_rank_name: player.chess_ranks?.display_name || 'Unranked',
                is_online: true,
                games_played: player.games_played,
                wins: player.wins,
                losses: player.losses,
                draws: player.draws,
                last_seen: player.last_seen
            })) || [];
        } catch (error) {
            console.error('Error in getOnlinePlayers:', error);
            return [];
        }
    }

    // Send invitation
    async sendInvitation(toUserId: string, timeControl: any): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) throw new Error('User not authenticated');

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // Expire in 5 minutes

        const { error } = await this.supabaseService.db
            .from('game_invitations')
            .insert({
                from_user_id: user.id,
                to_user_id: toUserId,
                time_control: timeControl,
                expires_at: expiresAt.toISOString()
            });

        if (error) throw error;
    }

    // Get received invitations
    async getReceivedInvitations(): Promise<GameInvitation[]> {
        const user = this.supabaseService.user;
        if (!user) return [];

        try {
            const { data: invitations, error } = await this.supabaseService.db
                .from('game_invitations')
                .select(`
                    *,
                    from_user:users!from_user_id (
                        id,
                        username,
                        current_elo,
                        games_played,
                        wins,
                        losses,
                        draws,
                        chess_ranks!current_rank_id (
                            display_name
                        )
                    ),
                    to_user:users!to_user_id (
                        id,
                        username,
                        current_elo,
                        games_played,
                        wins,
                        losses,
                        draws,
                        chess_ranks!current_rank_id (
                            display_name
                        )
                    )
                `)
                .eq('to_user_id', user.id)
                .eq('status', 'pending')
                .gt('expires_at', new Date().toISOString());

            if (error) {
                console.error('Error fetching invitations:', error);
                return [];
            }

            return invitations?.map((inv: any) => ({
                id: inv.id,
                from_user_id: inv.from_user_id,
                to_user_id: inv.to_user_id,
                from_user: {
                    id: inv.from_user.id,
                    username: inv.from_user.username,
                    avatar: '/assets/images/profile-avatar.png',
                    current_elo: inv.from_user.current_elo,
                    current_rank_name: inv.from_user.chess_ranks?.display_name || 'Unranked',
                    is_online: true,
                    games_played: inv.from_user.games_played,
                    wins: inv.from_user.wins,
                    losses: inv.from_user.losses,
                    draws: inv.from_user.draws
                },
                to_user: {
                    id: inv.to_user.id,
                    username: inv.to_user.username,
                    avatar: '/assets/images/profile-avatar.png',
                    current_elo: inv.to_user.current_elo,
                    current_rank_name: inv.to_user.chess_ranks?.display_name || 'Unranked',
                    is_online: true,
                    games_played: inv.to_user.games_played,
                    wins: inv.to_user.wins,
                    losses: inv.to_user.losses,
                    draws: inv.to_user.draws
                },
                time_control: inv.time_control,
                status: inv.status,
                created_at: inv.created_at,
                expires_at: inv.expires_at
            })) || [];
        } catch (error) {
            console.error('Error in getReceivedInvitations:', error);
            return [];
        }
    }

    // Accept invitation
    async acceptInvitation(invitationId: string): Promise<string> {
        const user = this.supabaseService.user;
        if (!user) throw new Error('User not authenticated');

        // Get invitation details
        const { data: invitation, error: invError } = await this.supabaseService.db
            .from('game_invitations')
            .select('*')
            .eq('id', invitationId)
            .single();

        if (invError || !invitation) throw new Error('Invitation not found');

        // Update invitation status
        await this.supabaseService.db
            .from('game_invitations')
            .update({ status: 'accepted' })
            .eq('id', invitationId);

        // Create game and return game ID
        const gameId = await this.createGameAndReturnId(invitation.from_user_id, invitation.to_user_id, invitation.time_control);
        return gameId;
    }

    // Create game and return ID
    private async createGameAndReturnId(player1Id: string, player2Id: string, timeControl: any): Promise<string> {
        // Randomly assign colors
        const player1IsWhite = Math.random() > 0.5;

        const gameData = {
            player1_id: player1IsWhite ? player1Id : player2Id,
            player2_id: player1IsWhite ? player2Id : player1Id,
            game_state: {
                white_player_id: player1IsWhite ? player1Id : player2Id,
                black_player_id: player1IsWhite ? player2Id : player1Id,
                time_control: timeControl,
                current_turn: 'white',
                white_time_left: timeControl.initial_time,
                black_time_left: timeControl.initial_time,
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                moves: []
            },
            status: 'active',
            started_at: new Date().toISOString()
        };

        const { data: game, error } = await this.supabaseService.db
            .from('games')
            .insert(gameData)
            .select()
            .single();

        if (error) {
            console.error('Error creating game:', error);
            throw new Error('Failed to create game');
        }

        // Remove both players from queue
        await this.supabaseService.db
            .from('matchmaking_queue')
            .delete()
            .in('user_id', [player1Id, player2Id]);

        // Create notifications
        await this.createMatchNotifications(player1Id, player2Id, game.id);

        return game.id;
    }

    // Decline invitation
    async declineInvitation(invitationId: string): Promise<void> {
        await this.supabaseService.db
            .from('game_invitations')
            .update({ status: 'declined' })
            .eq('id', invitationId);
    }

    // Update online status
    async updateOnlineStatus(isOnline: boolean): Promise<void> {
        const user = this.supabaseService.user;
        if (!user) return;

        await this.supabaseService.db
            .from('users')
            .update({
                is_online: isOnline,
                last_seen: new Date().toISOString()
            })
            .eq('id', user.id);
    }

    // Subscribe to real-time updates
    subscribeToMatchFound(callback: (gameId: string) => void): Subscription {
        return this.matchFound$.subscribe(gameId => {
            if (gameId) callback(gameId);
        });
    }

    // Subscribe to invitations
    subscribeToInvitations(callback: () => void): Subscription {
        const user = this.supabaseService.user;
        if (!user) return new Subscription();

        const channel = this.supabaseService.db
            .channel('invitations')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'game_invitations',
                filter: `to_user_id=eq.${user.id}`
            }, callback);

        channel.subscribe();

        return new Subscription(() => {
            channel.unsubscribe();
        });
    }
} 