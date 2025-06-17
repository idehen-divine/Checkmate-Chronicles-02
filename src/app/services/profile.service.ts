import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, from, map, catchError } from 'rxjs';
import { UserProfile, UserStats, NFTItem, MatchHistoryItem } from '../types';
import { SupabaseService } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class ProfileService {

    constructor(
        private router: Router,
        private supabaseService: SupabaseService
    ) { }

    // Get user profile data
    getUserProfile(): Observable<UserProfile> {
        const user = this.supabaseService.user;
        if (!user) {
            return of({
                name: 'Guest User',
                username: 'guest',
                rank: 'Unranked',
                avatar: 'assets/images/profile-avatar.png'
            });
        }

        return from(this.supabaseService.getUserProfile(user.id)).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    // Return default profile if no data found
                    return {
                        name: user.user_metadata?.['full_name'] || 'Chess Player',
                        username: data?.username || user.email?.split('@')[0] || 'player',
                        rank: 'Beginner | Unranked',
                        avatar: 'assets/images/profile-avatar.png'
                    };
                }

                return {
                    name: user.user_metadata?.['full_name'] || data.username,
                    username: data.username,
                    rank: 'Beginner | Unranked', // TODO: Calculate from games
                    avatar: 'assets/images/profile-avatar.png'
                };
            }),
            catchError(() => of({
                name: 'Chess Player',
                username: 'player',
                rank: 'Beginner | Unranked',
                avatar: 'assets/images/profile-avatar.png'
            }))
        );
    }

    // Get user stats
    getUserStats(): Observable<UserStats> {
        // TODO: Calculate real stats from games table
        const stats: UserStats = {
            wins: 'Wins: 0',
            losses: 0,
            nfts: 0,
            streak: 0,
            games: 0
        };
        return of(stats);
    }

    // Get NFT collection
    getNFTCollection(): Observable<NFTItem[]> {
        // TODO: Fetch real NFTs from database
        const nfts: NFTItem[] = [
            {
                name: 'First Checkmate',
                symbol: 'MATE1',
                image: 'assets/images/chess-background.png',
                price: '$0.00',
                priceChange: '+0.0%',
                isPositive: true
            }
        ];
        return of(nfts);
    }

    // Get match history
    getMatchHistory(): Observable<MatchHistoryItem[]> {
        // TODO: Fetch real match history from games table
        const matches: MatchHistoryItem[] = [];
        return of(matches);
    }

    // Get user preferences
    getUserPreferences(): Observable<any> {
        const user = this.supabaseService.user;
        if (!user) {
            return of({
                sounds_enabled: true,
                hints_enabled: true,
                legal_moves_enabled: true,
                game_invites_enabled: true,
                nft_mints_enabled: true,
                announcements_enabled: true
            });
        }

        return from(this.supabaseService.getUserProfile(user.id)).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return {
                        sounds_enabled: true,
                        hints_enabled: true,
                        legal_moves_enabled: true,
                        game_invites_enabled: true,
                        nft_mints_enabled: true,
                        announcements_enabled: true
                    };
                }

                return {
                    sounds_enabled: data.sounds_enabled ?? true,
                    hints_enabled: data.hints_enabled ?? true,
                    legal_moves_enabled: data.legal_moves_enabled ?? true,
                    game_invites_enabled: data.game_invites_enabled ?? true,
                    nft_mints_enabled: data.nft_mints_enabled ?? true,
                    announcements_enabled: data.announcements_enabled ?? true
                };
            }),
            catchError(() => of({
                sounds_enabled: true,
                hints_enabled: true,
                legal_moves_enabled: true,
                game_invites_enabled: true,
                nft_mints_enabled: true,
                announcements_enabled: true
            }))
        );
    }

    // Update user preferences
    async updateUserPreferences(preferences: any): Promise<{ success: boolean; error?: string }> {
        const user = this.supabaseService.user;
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await this.supabaseService.updateUserPreferences(user.id, preferences);
            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Failed to update preferences' };
        }
    }

    // Navigate to opponent profile
    viewOpponentProfile(opponentId: string): void {
        console.log('Navigating to opponent profile:', opponentId);
        // TODO: Implement opponent profile navigation
    }

    // Edit profile action
    editProfile(): void {
        console.log('Edit profile clicked');
        // TODO: Navigate to edit profile page
    }

    // View public profile action
    viewPublicProfile(): void {
        console.log('View public profile clicked');
        // TODO: Navigate to public profile view
    }
}