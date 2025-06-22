import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { UserProfile } from '../types';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import * as UserUtils from '../utils/user.util';

@Injectable({
    providedIn: 'root'
})
export class UserProfileService {

    constructor(
        private supabaseService: SupabaseService,
        private authService: AuthService
    ) { }

    // Get user profile data with chess rank
    getUserProfile(): Observable<UserProfile> {
        const user = this.supabaseService.user;
        if (!user) {
            return of(UserUtils.createGuestUserProfile());
        }

        return from(
            this.authService.safeUserOperation(
                () => this.supabaseService.db
                    .from('users')
                    .select(`
                    *,
                    chess_ranks (
                        display_name,
                        color_code
                    )
                `)
                    .eq('id', user.id)
                    .single(),
                'get_user_profile_with_rank'
            )
        ).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    // Return default profile if no data found using utility
                    return UserUtils.createDefaultUserProfile(
                        user.email,
                        user.user_metadata?.['full_name']
                    );
                }

                // Type assertion for the data
                const userData = data as any;

                // Format rank display with ELO
                const rankDisplay = userData.chess_ranks
                    ? `${userData.chess_ranks.display_name} | ${userData.current_elo || 1000}`
                    : `Novice | ${userData.current_elo || 1000}`;

                return {
                    name: user.user_metadata?.['full_name'] || userData.username,
                    username: userData.username,
                    email: user.email,
                    rank: rankDisplay,
                    avatar: UserUtils.generateAvatarUrl(userData),
                    currentElo: userData.current_elo,
                    highestElo: userData.highest_elo
                };
            }),
            catchError(() => of(UserUtils.createDefaultUserProfile()))
        );
    }

    // Update user profile data
    async updateUserProfile(updates: {
        username?: string;
        email?: string;
    }): Promise<{ success: boolean; error?: string }> {
        const user = this.supabaseService.user;
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const result = await this.authService.safeUserOperation(
                () => this.supabaseService.updateUserProfile(user.id, updates),
                'update_user_profile'
            );

            if (result.error) {
                return { success: false, error: result.error.message };
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Failed to update profile' };
        }
    }

    // Get user ID
    getCurrentUserId(): string | null {
        return this.supabaseService.user?.id || null;
    }

    // Check if user is authenticated
    isUserAuthenticated(): boolean {
        return !!this.supabaseService.user;
    }
} 