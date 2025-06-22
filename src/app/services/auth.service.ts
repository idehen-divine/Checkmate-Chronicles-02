import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

@Injectable({
	providedIn: 'root'
})
export class AuthService {
	private isAuthenticated = new BehaviorSubject<boolean>(false);
	private currentUser = new BehaviorSubject<User | null>(null);

	constructor(
		private supabaseService: SupabaseService,
		private router: Router
	) {
		// Subscribe to auth state changes
		this.supabaseService.user$.subscribe(user => {
			this.currentUser.next(user);
			this.isAuthenticated.next(!!user);
		});
	}

	get isAuthenticated$(): Observable<boolean> {
		return this.isAuthenticated.asObservable();
	}

	get user$(): Observable<User | null> {
		return this.currentUser.asObservable();
	}

	get user(): User | null {
		return this.currentUser.value;
	}

	get authReady$() {
		return this.supabaseService.authReady$;
	}

	async signInWithGoogle() {
		try {
			const { data, error } = await this.supabaseService.signInWithGoogle();
			if (error) {
				console.error('Google sign in error:', error);
				return { success: false, error: error.message };
			}
			return { success: true, data };
		} catch (error) {
			console.error('Google sign in error:', error);
			return { success: false, error: 'Failed to sign in with Google' };
		}
	}

	async signInWithApple() {
		try {
			const { data, error } = await this.supabaseService.signInWithApple();
			if (error) {
				console.error('Apple sign in error:', error);
				return { success: false, error: error.message };
			}
			return { success: true, data };
		} catch (error) {
			console.error('Apple sign in error:', error);
			return { success: false, error: 'Failed to sign in with Apple' };
		}
	}

	async signOut() {
		try {
			const { error } = await this.supabaseService.signOut();
			if (error) {
				console.error('Sign out error:', error);
				return { success: false, error: error.message };
			}
			this.router.navigate(['/auth']);
			return { success: true };
		} catch (error) {
			console.error('Sign out error:', error);
			return { success: false, error: 'Failed to sign out' };
		}
	}

	async checkAuthState() {
		const user = this.supabaseService.user;
		if (user) {
			// Check if user profile exists in our database
			const { data: profile, error } = await this.supabaseService.getUserProfile(user.id);

			if (error && error.code === 'PGRST116') {
				// User profile doesn't exist, create it
				await this.createUserProfile(user);
			}
		}
	}

	private async createUserProfile(user: User) {
		const username = user.user_metadata?.['full_name'] ||
			user.user_metadata?.['name'] ||
			user.email?.split('@')[0] ||
			`user_${user.id.slice(0, 8)}`;

		// Create user profile - user_settings will be created automatically by trigger
		const { data: profileData, error: profileError } = await this.supabaseService.createUserProfile({
			id: user.id,
			username: username,
			elo: 0, // Start at 0 as per new requirements
			wins: 0,
			losses: 0,
			draws: 0,
			avatar_url: user.user_metadata?.['avatar_url'] || null,
			is_online: true,
			last_seen_method: 'login',
			status: 'active' // Default to active status
		});

		if (profileError) {
			console.error('Error creating user profile:', profileError);
			return { data: null, error: profileError };
		}

		// Note: User settings are now created automatically by database trigger
		// No need to manually create them

		return { data: profileData, error: profileError };
	}

	async updateOnlineStatus(isOnline: boolean, method: string = 'unknown') {
		const user = this.supabaseService.user;
		if (!user) return;

		const { error } = await this.supabaseService.updateUserProfile(user.id, {
			is_online: isOnline,
			last_seen_at: new Date().toISOString(),
			last_seen_method: method
		});

		if (error) {
			console.error('Error updating online status:', error);
		}
	}

	async getUserProfile() {
		const user = this.supabaseService.user;
		if (!user) return { data: null, error: new Error('No user found') };

		return await this.supabaseService.getUserProfile(user.id);
	}

	async getUserSettings() {
		const user = this.supabaseService.user;
		if (!user) return { data: null, error: new Error('No user found') };

		return await this.supabaseService.getUserSettings(user.id);
	}

	async updateUserSettings(settings: any) {
		const user = this.supabaseService.user;
		if (!user) return { data: null, error: new Error('No user found') };

		return await this.supabaseService.updateUserSettings(user.id, settings);
	}

	getCurrentUser(): User | null {
		return this.supabaseService.user;
	}
}