/**
 * Pure utility functions for user preferences logic
 * Use these for lightweight preference operations without Angular dependencies
 */

export interface UserPreferences {
    sounds_enabled: boolean;
    notifications_enabled: boolean;
    theme: 'light' | 'dark' | 'system';
    allow_friend_challenges: boolean;
    custom_data: any;
}

/**
 * Get default user preferences
 */
export function getDefaultPreferences(): UserPreferences {
    return {
        sounds_enabled: true,
        notifications_enabled: true,
        theme: 'system',
        allow_friend_challenges: true,
        custom_data: {}
    };
}

/**
 * Check if any notifications are enabled
 */
export function areNotificationsEnabled(preferences: UserPreferences): boolean {
    return preferences.notifications_enabled;
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
        'notifications_enabled',
        'theme',
        'allow_friend_challenges',
        'custom_data'
    ];

    return requiredKeys.every(key => {
        if (key === 'theme') {
            return key in preferences && ['light', 'dark', 'system'].includes(preferences[key]);
        }
        if (key === 'custom_data') {
            return key in preferences;
        }
        return key in preferences && typeof preferences[key] === 'boolean';
    });
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
        preferences.sounds_enabled
    ];

    const notificationSettings = [
        preferences.notifications_enabled,
        preferences.allow_friend_challenges
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