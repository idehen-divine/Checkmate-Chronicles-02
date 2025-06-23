import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { Database } from '../types';

@Injectable({
	providedIn: 'root'
})
export class SupabaseService {
	private supabase: SupabaseClient<Database>;
	private currentUser = new BehaviorSubject<User | null>(null);
	private currentSession = new BehaviorSubject<Session | null>(null);
	private authReady = new BehaviorSubject<boolean>(false);
	public authReady$ = this.authReady.asObservable();

	constructor() {
		this.supabase = createClient<Database>(
			environment.supabase.url,
			environment.supabase.anonKey
		);

		// Listen for auth changes
		this.supabase.auth.onAuthStateChange((event, session) => {
			this.currentSession.next(session);
			this.currentUser.next(session?.user ?? null);
			if (event === 'INITIAL_SESSION') {
				this.authReady.next(true);
			}
		});
	}

	get user$(): Observable<User | null> {
		return this.currentUser.asObservable();
	}

	get session$(): Observable<Session | null> {
		return this.currentSession.asObservable();
	}

	get user(): User | null {
		return this.currentUser.value;
	}

	get session(): Session | null {
		return this.currentSession.value;
	}

	// Auth methods
	async signInWithGoogle() {
		const { data, error } = await this.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/dashboard`
			}
		});
		return { data, error };
	}

	async signInWithApple() {
		const { data, error } = await this.supabase.auth.signInWithOAuth({
			provider: 'apple',
			options: {
				redirectTo: `${window.location.origin}/dashboard`
			}
		});
		return { data, error };
	}

	async signOut() {
		const { error } = await this.supabase.auth.signOut();
		return { error };
	}

	// User profile methods
	async getUserProfile(userId: string) {
		const { data, error } = await this.supabase
			.from('users')
			.select('*')
			.eq('id', userId)
			.single();
		return { data, error };
	}

	async updateUserProfile(userId: string, updates: Database['public']['Tables']['users']['Update']) {
		const { data, error } = await this.supabase
			.from('users')
			.update(updates)
			.eq('id', userId)
			.select()
			.single();
		return { data, error };
	}

	async createUserProfile(user: Database['public']['Tables']['users']['Insert']) {
		const { data, error } = await this.supabase
			.from('users')
			.insert(user)
			.select()
			.single();
		return { data, error };
	}

	// User settings methods
	async getUserSettings(userId: string) {
		const { data, error } = await this.supabase
			.from('user_settings')
			.select('*')
			.eq('user_id', userId)
			.single();
		return { data, error };
	}

	async updateUserSettings(userId: string, settings: Database['public']['Tables']['user_settings']['Update']) {
		const { data, error } = await this.supabase
			.from('user_settings')
			.update(settings)
			.eq('user_id', userId)
			.select()
			.single();
		return { data, error };
	}

	async createUserSettings(settings: Database['public']['Tables']['user_settings']['Insert']) {
		const { data, error } = await this.supabase
			.from('user_settings')
			.insert(settings)
			.select()
			.single();
		return { data, error };
	}

	// Wallet methods
	async getUserWallet(userId: string) {
		const { data, error } = await this.supabase
			.from('wallets')
			.select('*')
			.eq('user_id', userId)
			.single();
		return { data, error };
	}

	async createUserWallet(wallet: Database['public']['Tables']['wallets']['Insert']) {
		const { data, error } = await this.supabase
			.from('wallets')
			.insert(wallet)
			.select()
			.single();
		return { data, error };
	}

	async updateUserWallet(userId: string, updates: Database['public']['Tables']['wallets']['Update']) {
		const { data, error } = await this.supabase
			.from('wallets')
			.update(updates)
			.eq('user_id', userId)
			.select()
			.single();
		return { data, error };
	}

	// Game methods
	async createGame(game: Database['public']['Tables']['games']['Insert']) {
		const { data, error } = await this.supabase
			.from('games')
			.insert(game)
			.select()
			.single();
		return { data, error };
	}

	async getGame(gameId: string) {
		const { data, error } = await this.supabase
			.from('games')
			.select('*')
			.eq('id', gameId)
			.single();
		return { data, error };
	}

	async updateGame(gameId: string, updates: Database['public']['Tables']['games']['Update']) {
		const { data, error } = await this.supabase
			.from('games')
			.update(updates)
			.eq('id', gameId)
			.select()
			.single();
		return { data, error };
	}

	async getUserGames(userId: string, limit: number = 50) {
		const { data, error } = await this.supabase
			.from('games')
			.select('*')
			.or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
			.order('created_at', { ascending: false })
			.limit(limit);
		return { data, error };
	}

	// Game moves methods
	async getGameMoves(gameId: string) {
		const { data, error } = await this.supabase
			.from('game_moves')
			.select('*')
			.eq('game_id', gameId)
			.order('move_number', { ascending: true });
		return { data, error };
	}

	async addGameMove(move: Database['public']['Tables']['game_moves']['Insert']) {
		const { data, error } = await this.supabase
			.from('game_moves')
			.insert(move)
			.select()
			.single();
		return { data, error };
	}

	// Game messages methods
	async getGameMessages(gameId: string) {
		const { data, error } = await this.supabase
			.from('game_messages')
			.select('*')
			.eq('game_id', gameId)
			.order('created_at', { ascending: true });
		return { data, error };
	}

	async sendGameMessage(message: Database['public']['Tables']['game_messages']['Insert']) {
		const { data, error } = await this.supabase
			.from('game_messages')
			.insert(message)
			.select()
			.single();
		return { data, error };
	}

	// Matchmaking methods
	async joinMatchmakingQueue(entry: Database['public']['Tables']['matchmaking_queue']['Insert']) {
		const { data, error } = await this.supabase
			.from('matchmaking_queue')
			.insert(entry)
			.select()
			.single();
		return { data, error };
	}

	async leaveMatchmakingQueue(playerId: string) {
		const { error } = await this.supabase
			.from('matchmaking_queue')
			.delete()
			.eq('player_id', playerId);
		return { error };
	}

	async getMatchmakingQueue() {
		const { data, error } = await this.supabase
			.from('matchmaking_queue')
			.select('*')
			.order('created_at', { ascending: true });
		return { data, error };
	}

	// Rating history methods
	async getUserRatingHistory(userId: string, limit: number = 50) {
		const { data, error } = await this.supabase
			.rpc('get_user_rating_progress', {
				p_user_id: userId,
				p_limit: limit
			});
		return { data, error };
	}

	async getUserRatingStats(userId: string) {
		const { data, error } = await this.supabase
			.rpc('get_user_rating_stats', {
				p_user_id: userId
			});
		return { data: data?.[0] || null, error };
	}

	async getRatingLeaderboard(limit: number = 100) {
		const { data, error } = await this.supabase
			.rpc('get_rating_leaderboard', {
				p_limit: limit
			});
		return { data, error };
	}

	// Real-time subscriptions
	subscribeToGame(gameId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`game:${gameId}`)
			.on('postgres_changes',
				{ event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
				callback
			)
			.subscribe();
	}

	subscribeToGameMoves(gameId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`game_moves:${gameId}`)
			.on('postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'game_moves', filter: `game_id=eq.${gameId}` },
				callback
			)
			.subscribe();
	}

	subscribeToGameMessages(gameId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`game_messages:${gameId}`)
			.on('postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'game_messages', filter: `game_id=eq.${gameId}` },
				callback
			)
			.subscribe();
	}

	subscribeToMatchmakingQueue(callback: (payload: any) => void) {
		return this.supabase
			.channel('matchmaking_queue')
			.on('postgres_changes',
				{ event: '*', schema: 'public', table: 'matchmaking_queue' },
				callback
			)
			.subscribe();
	}

	// Database access
	get db() {
		return this.supabase;
	}

	// User Activity & Ping System
	async pingUserActivity(
		userId: string,
		activityType: string = 'browsing',
		pageContext?: string,
		additionalData: any = {}
	) {
		const { data, error } = await this.supabase.rpc('ping_user_activity', {
			p_user_id: userId,
			p_activity_type: activityType,
			p_page_context: pageContext,
			p_additional_data: additionalData
		});
		return { data, error };
	}

	async getUserActivityStatus(userId: string) {
		const { data, error } = await this.supabase.rpc('get_user_activity_status', {
			p_user_id: userId
		});
		return { data, error };
	}

	async getActiveUsersCount() {
		const { data, error } = await this.supabase.rpc('get_active_users_count');
		return { data, error };
	}

	async setUserOfflineAfterTimeout() {
		const { data, error } = await this.supabase.rpc('set_user_offline_after_timeout');
		return { data, error };
	}

	// Game Ranking System
	async getGameRankings() {
		const { data, error } = await this.supabase
			.from('game_ranking')
			.select('*')
			.order('min_elo', { ascending: true });
		return { data, error };
	}

	async getUserRank(userId: string) {
		const { data, error } = await this.supabase.rpc('get_user_rank', {
			p_user_id: userId
		});
		return { data, error };
	}

	async getRankingLeaderboard() {
		const { data, error } = await this.supabase.rpc('get_ranking_leaderboard');
		return { data, error };
	}

	// Admin System
	async getAdminStatus(userId: string) {
		const { data, error } = await this.supabase
			.from('admins')
			.select('*')
			.eq('user_id', userId)
			.single();
		return { data, error };
	}

	async isUserAdmin(userId: string, requiredLevel?: string) {
		const { data, error } = await this.supabase.rpc('is_user_admin', {
			p_user_id: userId,
			p_required_level: requiredLevel
		});
		return { data, error };
	}

	async adminUpdateUserStatus(adminUserId: string, targetUserId: string, newStatus: 'active' | 'suspended') {
		const { data, error } = await this.supabase.rpc('admin_update_user_status', {
			p_admin_user_id: adminUserId,
			p_target_user_id: targetUserId,
			p_new_status: newStatus
		});
		return { data, error };
	}

	async createAdmin(admin: Database['public']['Tables']['admins']['Insert']) {
		const { data, error } = await this.supabase
			.from('admins')
			.insert(admin)
			.select()
			.single();
		return { data, error };
	}

	async updateAdmin(adminId: string, updates: Database['public']['Tables']['admins']['Update']) {
		const { data, error } = await this.supabase
			.from('admins')
			.update(updates)
			.eq('id', adminId)
			.select()
			.single();
		return { data, error };
	}

	async deleteAdmin(adminId: string) {
		const { data, error } = await this.supabase
			.from('admins')
			.delete()
			.eq('id', adminId);
		return { data, error };
	}

	async getAllAdmins() {
		const { data, error } = await this.supabase
			.from('admins')
			.select(`
				*,
				users:user_id (
					username,
					avatar_url
				)
			`)
			.order('created_at', { ascending: false });
		return { data, error };
	}

	// Cleanup methods - automatically triggered by database interactions
	async manualCleanupGameMoves() {
		const { data, error } = await this.supabase.rpc('cleanup_old_game_moves');
		return { data, error };
	}

	async manualCleanupGameMessages() {
		const { data, error } = await this.supabase.rpc('cleanup_old_game_messages');
		return { data, error };
	}

	async manualCleanupGameEvents() {
		const { data, error } = await this.supabase.rpc('cleanup_old_game_events');
		return { data, error };
	}

	async manualCleanupGameLobbyLogs() {
		const { data, error } = await this.supabase.rpc('cleanup_old_game_lobby_logs');
		return { data, error };
	}

	async manualCleanupRatingHistory() {
		const { data, error } = await this.supabase.rpc('cleanup_old_rating_history');
		return { data, error };
	}

	async manualCleanupGames() {
		const { data, error } = await this.supabase.rpc('cleanup_old_games');
		return { data, error };
	}

	async manualCleanupMatchmakingQueue() {
		const { data, error } = await this.supabase.rpc('cleanup_old_matchmaking_queue');
		return { data, error };
	}

	async manualCleanupGameEventsWithReport() {
		const { data, error } = await this.supabase.rpc('manual_cleanup_game_events');
		return { data, error };
	}

	// Statistics methods
	async getGameMovesStats() {
		const { data, error } = await this.supabase.rpc('get_game_moves_stats');
		return { data: data?.[0] || null, error };
	}

	async getGameMessagesStats() {
		const { data, error } = await this.supabase.rpc('get_game_messages_stats');
		return { data: data?.[0] || null, error };
	}

	async getGameEventsStats() {
		const { data, error } = await this.supabase.rpc('get_game_events_stats');
		return { data: data?.[0] || null, error };
	}

	async getGameLobbyLogsStats() {
		const { data, error } = await this.supabase.rpc('get_game_lobby_logs_stats');
		return { data: data?.[0] || null, error };
	}

	async getRatingHistoryStats() {
		const { data, error } = await this.supabase.rpc('get_rating_history_stats');
		return { data: data?.[0] || null, error };
	}

	async getGamesStats() {
		const { data, error } = await this.supabase.rpc('get_games_stats');
		return { data: data?.[0] || null, error };
	}

	async getMatchmakingQueueStats() {
		const { data, error } = await this.supabase.rpc('get_matchmaking_queue_stats');
		return { data: data?.[0] || null, error };
	}

	// Comprehensive database statistics
	async getAllDatabaseStats() {
		try {
			const [
				movesStats,
				messagesStats,
				eventsStats,
				lobbyStats,
				ratingStats,
				gamesStats,
				queueStats
			] = await Promise.all([
				this.getGameMovesStats(),
				this.getGameMessagesStats(),
				this.getGameEventsStats(),
				this.getGameLobbyLogsStats(),
				this.getRatingHistoryStats(),
				this.getGamesStats(),
				this.getMatchmakingQueueStats()
			]);

			return {
				data: {
					moves: movesStats.data,
					messages: messagesStats.data,
					events: eventsStats.data,
					lobby: lobbyStats.data,
					ratings: ratingStats.data,
					games: gamesStats.data,
					queue: queueStats.data
				},
				error: null
			};
		} catch (error) {
			return { data: null, error };
		}
	}

	// Manual cleanup all tables
	async manualCleanupAllTables() {
		try {
			const results = await Promise.all([
				this.manualCleanupGameMoves(),
				this.manualCleanupGameMessages(),
				this.manualCleanupGameEvents(),
				this.manualCleanupGameLobbyLogs(),
				this.manualCleanupRatingHistory(),
				this.manualCleanupGames(),
				this.manualCleanupMatchmakingQueue()
			]);

			const errors = results.filter(result => result.error);
			return {
				data: {
					cleaned_tables: results.length - errors.length,
					total_tables: results.length,
					errors: errors.map(e => e.error)
				},
				error: errors.length > 0 ? errors[0].error : null
			};
		} catch (error) {
			return { data: null, error };
		}
	}

	// User management utility functions
	async cleanupOrphanedUserSettings(userId: string) {
		const { data, error } = await this.supabase
			.rpc('cleanup_orphaned_user_settings', { p_user_id: userId });
		return { data, error };
	}
}