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
	private isHandlingUserSession = false; // Prevent concurrent session handling
	private isInitialSessionComplete = false; // Track if initial session setup is done
	constructor(
		private supabaseService: SupabaseService,
		private router: Router
	) {
		// Subscribe to auth state changes
		this.supabaseService.user$.subscribe(async user => {
			console.log('Auth state change - User:', user ? `${user.id} (${user.email})` : 'null');
			this.currentUser.next(user);
			this.isAuthenticated.next(!!user);

			// Reset initial session flag when user logs out
			if (!user) {
				this.isInitialSessionComplete = false;
			} else if (!this.isInitialSessionComplete && !this.isHandlingUserSession) {
				// If we have a user but haven't completed initial session setup, do it now
				console.log('User detected, starting immediate session handling...');
				await this.handleUserSession(user);
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
	} async signInWithGoogle() {
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
	} async signInWithApple() {
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

		console.log('Creating user profile with data:', {
			id: user.id,
			username: username,
			email: user.email,
			metadata: user.user_metadata
		});

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

		console.log('User profile created successfully:', profileData);

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
		const notFoundCodes = ['PGRST116', '23503', '406', '404']; // PGRST116 = no rows returned, 23503 = foreign key violation

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
			'resource not found',
			'406',
			'404'
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

			// Only handle user not found errors if initial session setup is complete
			// This prevents premature logout during user profile creation
			if (normalizedResult.error && this.isUserNotFoundError(normalizedResult.error) && this.isInitialSessionComplete) {
				await this.handleUserProfileNotFound(normalizedResult.error, context);
				return { data: null, error: new Error('User logged out due to missing profile') };
			}

			return normalizedResult;
		} catch (error) {
			// Handle any unexpected errors - only if initial session is complete
			if (this.isUserNotFoundError(error) && this.isInitialSessionComplete) {
				await this.handleUserProfileNotFound(error, context);
				return { data: null, error: new Error('User logged out due to missing profile') };
			}

			throw error;
		}
	} private async handleUserSession(user: User) {
		// Prevent concurrent execution
		if (this.isHandlingUserSession) {
			console.log('User session handling already in progress, skipping...');
			return;
		}

		this.isHandlingUserSession = true;
		console.log('Handling user session for:', user.id, 'Email:', user.email);

		try {
			// Check if user profile exists in our database
			console.log('Checking if user profile exists...');

			// Use direct supabase call to avoid safeUserOperation during initial setup
			const { data: profile, error } = await this.supabaseService.getUserProfile(user.id); if (error) {
				console.log('Error getting user profile:', error);
				console.log('Error code:', error.code);
				console.log('Error message:', error.message);
				console.log('Error details:', error.details);
				console.log('Full error object:', JSON.stringify(error, null, 2));

				// Handle different error types that indicate user doesn't exist
				// Check various ways the 406 error can manifest
				const errorString = JSON.stringify(error).toLowerCase();
				const errorMessage = (error.message || '').toLowerCase();

				if (
					error.code === 'PGRST116' || // No rows returned
					errorString.includes('406') || // Check in full error object
					errorMessage.includes('406') ||
					errorMessage.includes('not acceptable') ||
					errorMessage.includes('no rows') ||
					error.code === '42P01' || // Table doesn't exist
					this.isUserNotFoundError(error)
				) {
					// User profile doesn't exist, create it (this is likely a new sign-in)
					console.log('User profile not found (detected 406 or similar), creating new profile...');
					const createResult = await this.createUserProfile(user);

					if (createResult.error) {
						console.error('Failed to create user profile:', createResult.error);
						console.error('Profile creation failed, but not logging out during initial setup');
					} else {
						console.log('User profile created successfully!', createResult.data);
					}
				} else {
					console.error('Unexpected error checking user profile:', error);
				}
			} else if (profile) {
				console.log('User profile exists, session handled successfully. Profile:', profile.username);
			} else {
				console.log('No profile data returned but no error - creating profile as fallback');
				// No data and no error - create profile as fallback
				const createResult = await this.createUserProfile(user);
				if (createResult.error) {
					console.error('Failed to create fallback user profile:', createResult.error);
				} else {
					console.log('Fallback user profile created successfully!', createResult.data);
				}
			}
		} catch (error) {
			console.error('Exception in handleUserSession:', error);

			// If we get an exception that looks like a user not found error, try to create the profile
			if (this.isUserNotFoundError(error)) {
				console.log('Exception appears to be user not found, attempting to create profile...');
				try {
					const createResult = await this.createUserProfile(user);
					if (createResult.error) {
						console.error('Failed to create user profile after exception:', createResult.error);
					} else {
						console.log('User profile created successfully after exception!', createResult.data);
					}
				} catch (createError) {
					console.error('Failed to create profile after exception:', createError);
				}
			}
		} finally {
			// Always reset the flag when done and mark initial session as complete
			this.isHandlingUserSession = false;
			this.isInitialSessionComplete = true;
			console.log('User session handling completed, isInitialSessionComplete set to true');
		}
	}
}
