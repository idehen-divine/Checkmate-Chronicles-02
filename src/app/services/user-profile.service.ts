import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { UserProfile } from '../types';
import { SupabaseService } from './supabase.service';
import * as UserUtils from '../utils/user.util';

@Injectable({
    providedIn: 'root'
})
export class UserProfileService {

    constructor(private supabaseService: SupabaseService) { }    // Get user profile data with chess rank
    getUserProfile(): Observable<UserProfile> {
        const user = this.supabaseService.user;
        if (!user) {
            return of(UserUtils.createGuestUserProfile());
        }

        return from(
            this.supabaseService.db
                .from('users')
                .select(`
                    *,
                    chess_ranks (
                        display_name,
                        color_code
                    )
                `)
                .eq('id', user.id)
                .single()
        ).pipe(            map(({ data, error }) => {
                if (error || !data) {
                    // Return default profile if no data found using utility
                    return UserUtils.createDefaultUserProfile(
                        user.email, 
                        user.user_metadata?.['full_name']
                    );
                }

                // Format rank display with ELO
                const rankDisplay = data.chess_ranks
                    ? `${data.chess_ranks.display_name} | ${data.current_elo || 1000}`
                    : `Novice | ${data.current_elo || 1000}`;

                return {
                    name: user.user_metadata?.['full_name'] || data.username,
                    username: data.username,
                    email: user.email,
                    rank: rankDisplay,
                    avatar: UserUtils.generateAvatarUrl(data),
                    currentElo: data.current_elo,
                    highestElo: data.highest_elo
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
            const { data, error } = await this.supabaseService.updateUserProfile(user.id, updates);
            if (error) {
                return { success: false, error: error.message };
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