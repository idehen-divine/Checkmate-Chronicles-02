import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { SupabaseService } from './supabase.service';
import * as PreferencesUtils from '../utils/preferences.util';

export interface UserPreferences {
    sounds_enabled: boolean;
    notifications_enabled: boolean;
    theme: 'light' | 'dark' | 'system';
    allow_friend_challenges: boolean;
    custom_data: any;
}

@Injectable({
    providedIn: 'root'
})
export class UserPreferencesService {

    constructor(private supabaseService: SupabaseService) { }    // Get user preferences
    getUserPreferences(): Observable<UserPreferences> {
        const user = this.supabaseService.user;
        if (!user) {
            return of(PreferencesUtils.getDefaultPreferences());
        }

        return from(this.supabaseService.getUserSettings(user.id)).pipe(
            map(({ data, error }) => {
                if (error || !data) {
                    return PreferencesUtils.getDefaultPreferences();
                }

                // Merge with defaults to handle any missing fields
                return PreferencesUtils.mergeWithDefaults({
                    sounds_enabled: data.sounds_enabled,
                    notifications_enabled: data.notifications_enabled,
                    theme: data.theme,
                    allow_friend_challenges: data.allow_friend_challenges,
                    custom_data: data.custom_data
                });
            }),
            catchError(() => of(PreferencesUtils.getDefaultPreferences()))
        );
    }

    // Update user preferences
    async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> {
        const user = this.supabaseService.user;
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await this.supabaseService.updateUserSettings(user.id, preferences);
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
    }    // Reset preferences to default
    async resetPreferences(): Promise<{ success: boolean; error?: string }> {
        return this.updateUserPreferences(PreferencesUtils.getDefaultPreferences());
    }

    // Get specific preference value
    getPreference(key: keyof UserPreferences): Observable<boolean> {
        return this.getUserPreferences().pipe(
            map(preferences => preferences[key])
        );
    }    // Toggle a preference
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

            // Use utility to toggle the preference
            const updatedPrefs = PreferencesUtils.togglePreference(currentPrefs, key);
            return this.updatePreference(key, updatedPrefs[key]);
        } catch (error) {
            return { success: false, error: 'Failed to toggle preference' };
        }
    }

    // Check if notifications are enabled (aggregated check)
    areNotificationsEnabled(): Observable<boolean> {
        return this.getUserPreferences().pipe(
            map(preferences => PreferencesUtils.areNotificationsEnabled(preferences))
        );
    }    // Get preferences summary (useful for dashboard/analytics)
    getPreferencesSummary(): Observable<ReturnType<typeof PreferencesUtils.getPreferencesSummary>> {
        return this.getUserPreferences().pipe(
            map(preferences => PreferencesUtils.getPreferencesSummary(preferences))
        );
    }

    // Import preferences (from backup) - with validation
    async importPreferences(preferences: any): Promise<{ success: boolean; error?: string }> {
        if (!PreferencesUtils.validatePreferences(preferences)) {
            return { success: false, error: 'Invalid preferences format' };
        }
        return this.updateUserPreferences(preferences);
    }
}