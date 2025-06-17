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

	// User preferences methods
	async updateUserPreferences(userId: string, preferences: {
		sounds_enabled?: boolean;
		hints_enabled?: boolean;
		legal_moves_enabled?: boolean;
		game_invites_enabled?: boolean;
		nft_mints_enabled?: boolean;
		announcements_enabled?: boolean;
	}) {
		const { data, error } = await this.supabase
			.from('users')
			.update(preferences)
			.eq('id', userId)
			.select()
			.single();
		return { data, error };
	}

	// Database access
	get db() {
		return this.supabase;
	}
}