import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface UserPreferences {
    sounds_enabled: boolean;
    hints_enabled: boolean;
    legal_moves_enabled: boolean;
    game_invites_enabled: boolean;
    nft_mints_enabled: boolean;
    announcements_enabled: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class UserPreferencesService {

    constructor(private supabaseService: SupabaseService) { }

    // Get user preferences
    getUserPreferences(): Observable<UserPreferences> {
        const user = this.supabaseService.user;
        if (!user) {
            return of(this.getDefaultPreferences());
        }

        return from(this.supabaseService.getUserProfile(user.id)).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return this.getDefaultPreferences();
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
            catchError(() => of(this.getDefaultPreferences()))
        );
    }

    // Update user preferences
    async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> {
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

    // Update individual preference
    async updatePreference(key: keyof UserPreferences, value: boolean): Promise<{ success: boolean; error?: string }> {
        return this.updateUserPreferences({ [key]: value });
    }

    // Reset preferences to default
    async resetPreferences(): Promise<{ success: boolean; error?: string }> {
        return this.updateUserPreferences(this.getDefaultPreferences());
    }

    // Get specific preference value
    getPreference(key: keyof UserPreferences): Observable<boolean> {
        return this.getUserPreferences().pipe(
            map(preferences => preferences[key])
        );
    }

    // Toggle a preference
    async togglePreference(key: keyof UserPreferences): Promise<{ success: boolean; error?: string }> {
        const user = this.supabaseService.user;
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            // First get current preferences
            const currentPrefs = await this.getUserPreferences().toPromise();
            if (!currentPrefs) {
                return { success: false, error: 'Failed to get current preferences' };
            }

            // Toggle the specific preference
            const newValue = !currentPrefs[key];
            return this.updatePreference(key, newValue);
        } catch (error) {
            return { success: false, error: 'Failed to toggle preference' };
        }
    }

    // Check if notifications are enabled (aggregated check)
    areNotificationsEnabled(): Observable<boolean> {
        return this.getUserPreferences().pipe(
            map(preferences =>
                preferences.game_invites_enabled ||
                preferences.nft_mints_enabled ||
                preferences.announcements_enabled
            )
        );
    }

    // Get default preferences
    private getDefaultPreferences(): UserPreferences {
        return {
            sounds_enabled: true,
            hints_enabled: true,
            legal_moves_enabled: true,
            game_invites_enabled: true,
            nft_mints_enabled: true,
            announcements_enabled: true
        };
    }

    // Export preferences (for backup/restore)
    async exportPreferences(): Promise<{ success: boolean; data?: UserPreferences; error?: string }> {
        try {
            const preferences = await this.getUserPreferences().toPromise();
            if (!preferences) {
                return { success: false, error: 'Failed to get preferences' };
            }
            return { success: true, data: preferences };
        } catch (error) {
            return { success: false, error: 'Failed to export preferences' };
        }
    }

    // Import preferences (from backup)
    async importPreferences(preferences: UserPreferences): Promise<{ success: boolean; error?: string }> {
        return this.updateUserPreferences(preferences);
    }
} 