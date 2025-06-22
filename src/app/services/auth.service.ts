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
	private hasHandledCurrentUser = false; // Track if we've handled the current user

	constructor(
		private supabaseService: SupabaseService,
		private router: Router
	) {
		// Subscribe to auth state changes
		this.supabaseService.user$.subscribe(async user => {
			console.log('Auth state change - User:', user ? `${user.id} (${user.email})` : 'null', 'HasHandled:', this.hasHandledCurrentUser);

			this.currentUser.next(user);
			this.isAuthenticated.next(!!user);

			if (user && !this.hasHandledCurrentUser) {
				// Mark that we're handling this user to prevent duplicate processing
				this.hasHandledCurrentUser = true;
				console.log('Starting user session handling in 2 seconds...');

				// Wait a bit for the auth state to settle, then handle the user session
				setTimeout(async () => {
					try {
						await this.handleUserSession(user);
					} catch (error) {
						console.error('Error handling user session:', error);
						// Reset flag so we can try again if needed
						this.hasHandledCurrentUser = false;
					}
				}, 2000); // Increased timeout to 2 seconds
			} else if (!user) {
				// Reset the flag when user logs out
				console.log('User logged out, resetting hasHandledCurrentUser flag');
				this.hasHandledCurrentUser = false;
			} else if (user && this.hasHandledCurrentUser) {
				console.log('User already handled, skipping session handling');
			}
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
			// If it doesn't exist, trigger logout instead of creating it
			const result = await this.safeUserOperation(
				() => this.supabaseService.getUserProfile(user.id),
				'check_auth_state'
			);

			// The safeUserOperation will handle the logout if profile is missing
			// No need to do anything else here
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

		return await this.safeUserOperation(
			() => this.supabaseService.getUserProfile(user.id),
			'get_user_profile'
		);
	}

	async getUserSettings() {
		const user = this.supabaseService.user;
		if (!user) return { data: null, error: new Error('No user found') };

		return await this.safeUserOperation(
			() => this.supabaseService.getUserSettings(user.id),
			'get_user_settings'
		);
	}

	async updateUserSettings(settings: any) {
		const user = this.supabaseService.user;
		if (!user) return { data: null, error: new Error('No user found') };

		return await this.supabaseService.updateUserSettings(user.id, settings);
	}

	getCurrentUser(): User | null {
		return this.supabaseService.user;
	}

	/**
 * Handles cases where user profile doesn't exist but user has valid auth token
 * This usually means the profile was deleted or there's a data inconsistency
 */
	async handleUserProfileNotFound(error: any, context: string = 'unknown'): Promise<void> {
		console.warn(`User profile not found in context: ${context}`, error);

		// Check if this is a "user not found" type error
		if (this.isUserNotFoundError(error)) {
			console.log('Detected user profile missing - logging out user and reloading page');

			try {
				// Log the user out from Supabase
				await this.supabaseService.signOut();

				// Clear any local storage/session data
				localStorage.clear();
				sessionStorage.clear();

				console.log('User has been logged out due to missing profile. Reloading page...');

				// Force full page reload to close all modals and reset app state
				window.location.reload();

			} catch (logoutError) {
				console.error('Error during logout, forcing page reload anyway:', logoutError);
				// Even if logout fails, reload the page to reset everything
				window.location.reload();
			}
		}
	}

	/**
	 * Checks if an error indicates that the user profile doesn't exist
	 */
	private isUserNotFoundError(error: any): boolean {
		if (!error) return false;

		// Common Supabase error codes for "not found"
		const notFoundCodes = ['PGRST116', '23503']; // PGRST116 = no rows returned, 23503 = foreign key violation

		// Check error code
		if (error.code && notFoundCodes.includes(error.code)) {
			return true;
		}

		// Check HTTP status codes that indicate user/resource not found
		if (error.status === 404 || error.status === 406 || error.status === 410) {
			return true;
		}

		// Check error message patterns
		const notFoundMessages = [
			'no rows returned',
			'user not found',
			'profile not found',
			'foreign key violation',
			'violates foreign key constraint',
			'not acceptable',
			'resource not found'
		];

		const errorMessage = (error.message || '').toLowerCase();
		return notFoundMessages.some(msg => errorMessage.includes(msg));
	}

	/**
 * Wrapper for database operations that automatically handles user not found errors
 */
	async safeUserOperation<T>(
		operation: () => Promise<{ data: T | null; error: any }> | any,
		context: string = 'user_operation'
	): Promise<{ data: T | null; error: any }> {
		try {
			const result = await operation();

			// Handle different return types from Supabase operations
			let normalizedResult: { data: T | null; error: any };

			if (result && typeof result === 'object' && 'data' in result && 'error' in result) {
				// Standard Supabase service method format
				normalizedResult = result;
			} else if (result && typeof result === 'object' && 'then' in result) {
				// Supabase query builder - need to await it
				normalizedResult = await result;
			} else {
				// Unknown format
				normalizedResult = { data: result, error: null };
			}

			// If there's an error that indicates user not found, handle it
			if (normalizedResult.error && this.isUserNotFoundError(normalizedResult.error)) {
				await this.handleUserProfileNotFound(normalizedResult.error, context);
				return { data: null, error: new Error('User logged out due to missing profile') };
			}

			return normalizedResult;
		} catch (error) {
			// Handle any unexpected errors
			if (this.isUserNotFoundError(error)) {
				await this.handleUserProfileNotFound(error, context);
				return { data: null, error: new Error('User logged out due to missing profile') };
			}

			throw error;
		}
	}

	private async handleUserSession(user: User) {
		console.log('Handling user session for:', user.id, 'Email:', user.email);

		try {
			// Check if user profile exists in our database
			const { data: profile, error } = await this.supabaseService.getUserProfile(user.id);

			if (error) {
				console.log('Error getting user profile:', error);

				if (error.code === 'PGRST116' || this.isUserNotFoundError(error)) {
					// User profile doesn't exist, create it (this is likely a new sign-in)
					console.log('User profile not found, creating new profile...');
					const createResult = await this.createUserProfile(user);

					if (createResult.error) {
						console.error('Failed to create user profile:', createResult.error);
						// If we can't create the profile, log the user out
						await this.handleUserProfileNotFound(createResult.error, 'profile_creation_failed');
					} else {
						console.log('User profile created successfully!');
					}
				} else {
					console.error('Unexpected error checking user profile:', error);
				}
			} else if (profile) {
				console.log('User profile exists, session handled successfully. Profile:', profile.username);
			} else {
				console.log('No profile data returned but no error - this is unusual');
			}
		} catch (error) {
			console.error('Exception in handleUserSession:', error);
		}
	}
}