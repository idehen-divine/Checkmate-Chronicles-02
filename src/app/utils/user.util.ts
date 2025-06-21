/**
 * Pure utility functions for user data processing
 * Use these for lightweight user operations without Angular dependencies
 */

import { UserProfile } from '../types';

/**
 * Create a default user profile
 */
export function createDefaultUserProfile(email?: string, fullName?: string): UserProfile {
    return {
        name: fullName || 'Chess Player',
        username: email?.split('@')[0] || 'player',
        email: email,
        rank: 'Novice | Unranked',
        avatar: 'assets/images/profile-avatar.png'
    };
}

/**
 * Create a guest user profile
 */
export function createGuestUserProfile(): UserProfile {
    return {
        name: 'Guest User',
        username: 'guest',
        email: undefined,
        rank: 'Unranked',
        avatar: 'assets/images/profile-avatar.png'
    };
}

/**
 * Extract username from email
 */
export function extractUsernameFromEmail(email: string): string {
    return email.split('@')[0];
}

/**
 * Format user rank display
 */
export function formatUserRank(rank: string, isRanked: boolean = true): string {
    if (!isRanked) {
        return `${rank} | Unranked`;
    }
    return rank;
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
    // Username should be 3-20 characters, alphanumeric plus underscore/dash
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
}

/**
 * Generate avatar URL from user data
 */
export function generateAvatarUrl(userData: any): string {
    // Check if user has a custom avatar
    if (userData.avatar_url) {
        return userData.avatar_url;
    }
    
    // Check if user has a profile picture from OAuth
    if (userData.picture) {
        return userData.picture;
    }
    
    // Return default avatar
    return 'assets/images/profile-avatar.png';
}

/**
 * Format user display name
 */
export function formatDisplayName(firstName?: string, lastName?: string, email?: string): string {
    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    }
    
    if (firstName) {
        return firstName;
    }
    
    if (email) {
        return extractUsernameFromEmail(email);
    }
    
    return 'Chess Player';
}

/**
 * Check if user profile is complete
 */
export function isProfileComplete(profile: UserProfile): boolean {
    return !!(
        profile.name && 
        profile.username && 
        profile.email
    );
}

/**
 * Get profile completion percentage
 */
export function getProfileCompletionPercentage(profile: UserProfile): number {
    const fields = ['name', 'username', 'email', 'avatar'];
    const completedFields = fields.filter(field => {
        const value = profile[field as keyof UserProfile];
        return value && value !== 'assets/images/profile-avatar.png';
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
}

/**
 * Sanitize user input for profile fields
 */
export function sanitizeUserInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
}

/**
 * Create user profile from raw data
 */
export function createUserProfileFromData(data: any, defaultRank: string = 'Novice'): UserProfile {
    return {
        name: formatDisplayName(data.first_name, data.last_name, data.email),
        username: data.username || extractUsernameFromEmail(data.email || ''),
        email: data.email,
        rank: data.chess_ranks?.display_name || formatUserRank(defaultRank, false),
        avatar: generateAvatarUrl(data)
    };
}
