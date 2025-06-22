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
                    .select('*')
                    .eq('id', user.id)
                    .single(),
                'get_user_profile_with_rank'
            )
        ).pipe(
            map(({ data, error }) => {
                if (error) {
                    // If there's an error after safe operation, it means user wasn't logged out
                    // Return default profile as fallback
                    return UserUtils.createDefaultUserProfile(
                        user.email,
                        user.user_metadata?.['full_name']
                    );
                }

                if (!data) {
                    // No data but no error - return default profile
                    return UserUtils.createDefaultUserProfile(
                        user.email,
                        user.user_metadata?.['full_name']
                    );
                }

                // Type assertion for the data
                const userData = data as any;

                // Get rank name based on ELO using game_ranking logic
                const userElo = userData.elo || 0;
                let rankName = 'Beginner';

                if (userElo >= 2300) rankName = 'Grandmaster';
                else if (userElo >= 1900) rankName = 'Master';
                else if (userElo >= 1500) rankName = 'Advanced';
                else if (userElo >= 1000) rankName = 'Intermediate';
                else rankName = 'Beginner';

                // Format rank display with ELO
                const rankDisplay = `${rankName} | ${userElo}`;

                return {
                    name: user.user_metadata?.['full_name'] || userData.username,
                    username: userData.username,
                    email: user.email,
                    rank: rankDisplay,
                    avatar: UserUtils.generateAvatarUrl(userData),
                    currentElo: userData.elo,
                    highestElo: userData.elo // For now, use current ELO as highest
                };
            })
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