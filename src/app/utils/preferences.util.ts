/**
 * Pure utility functions for user preferences logic
 * Use these for lightweight preference operations without Angular dependencies
 */

export interface UserPreferences {
    sounds_enabled: boolean;
    hints_enabled: boolean;
    legal_moves_enabled: boolean;
    game_invites_enabled: boolean;
    nft_mints_enabled: boolean;
    announcements_enabled: boolean;
}

/**
 * Get default user preferences
 */
export function getDefaultPreferences(): UserPreferences {
    return {
        sounds_enabled: true,
        hints_enabled: true,
        legal_moves_enabled: true,
        game_invites_enabled: true,
        nft_mints_enabled: true,
        announcements_enabled: true
    };
}

/**
 * Check if any notifications are enabled
 */
export function areNotificationsEnabled(preferences: UserPreferences): boolean {
    return preferences.game_invites_enabled ||
           preferences.nft_mints_enabled ||
           preferences.announcements_enabled;
}

/**
 * Toggle a specific preference
 */
export function togglePreference(
    preferences: UserPreferences, 
    key: keyof UserPreferences
): UserPreferences {
    return {
        ...preferences,
        [key]: !preferences[key]
    };
}

/**
 * Update specific preferences
 */
export function updatePreferences(
    currentPreferences: UserPreferences,
    updates: Partial<UserPreferences>
): UserPreferences {
    return {
        ...currentPreferences,
        ...updates
    };
}

/**
 * Validate preferences object
 */
export function validatePreferences(preferences: any): preferences is UserPreferences {
    if (!preferences || typeof preferences !== 'object') {
        return false;
    }

    const requiredKeys: (keyof UserPreferences)[] = [
        'sounds_enabled',
        'hints_enabled', 
        'legal_moves_enabled',
        'game_invites_enabled',
        'nft_mints_enabled',
        'announcements_enabled'
    ];

    return requiredKeys.every(key => 
        key in preferences && typeof preferences[key] === 'boolean'
    );
}

/**
 * Merge preferences with defaults (useful for migration)
 */
export function mergeWithDefaults(preferences: Partial<UserPreferences>): UserPreferences {
    const defaults = getDefaultPreferences();
    return {
        ...defaults,
        ...preferences
    };
}

/**
 * Get a summary of enabled preferences
 */
export function getPreferencesSummary(preferences: UserPreferences): {
    totalSettings: number;
    enabledSettings: number;
    disabledSettings: number;
    categories: {
        gameplay: number;
        notifications: number;
    };
} {
    const gameplaySettings = [
        preferences.sounds_enabled,
        preferences.hints_enabled,
        preferences.legal_moves_enabled
    ];

    const notificationSettings = [
        preferences.game_invites_enabled,
        preferences.nft_mints_enabled,
        preferences.announcements_enabled
    ];

    const allSettings = [...gameplaySettings, ...notificationSettings];
    const enabledCount = allSettings.filter(Boolean).length;

    return {
        totalSettings: allSettings.length,
        enabledSettings: enabledCount,
        disabledSettings: allSettings.length - enabledCount,
        categories: {
            gameplay: gameplaySettings.filter(Boolean).length,
            notifications: notificationSettings.filter(Boolean).length
        }
    };
}
