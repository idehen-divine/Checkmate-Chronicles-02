/**
 * Game utility functions
 * Contains helper functions for game operations, slug generation, and game state management
 */

/**
 * Generate a unique slug for a game based on game type
 * Format: game-type-00001, game-type-00002, etc.
 * 
 * @param gameType The type of game (e.g., 'quick-match', 'tournament', 'custom')
 * @param counter Optional counter for uniqueness (will be generated if not provided)
 * @returns A unique slug string
 */
export function generateGameSlug(gameType: string, counter?: number): string {
    // Clean and format the game type
    const baseSlug = gameType
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with dash
        .replace(/-+/g, '-')        // Replace multiple dashes with single dash
        .replace(/^-|-$/g, '');     // Remove leading/trailing dashes

    // Generate counter if not provided
    const slugCounter = counter || Math.floor(Math.random() * 99999) + 1;

    // Format with leading zeros (5 digits)
    const formattedCounter = slugCounter.toString().padStart(5, '0');

    return `${baseSlug}-${formattedCounter}`;
}

/**
 * Generate a human-readable game title from slug
 * 
 * @param slug The game slug
 * @returns A formatted game title
 */
export function getGameTitleFromSlug(slug: string): string {
    if (!slug) return 'Unknown Game';

    // Remove the counter suffix and format
    const basePart = slug.split('-').slice(0, -1).join(' ');

    // Capitalize each word
    return basePart
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Validate if a string is a valid UUID
 * 
 * @param str The string to validate
 * @returns True if the string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Validate if a string is a valid game slug
 * 
 * @param str The string to validate
 * @returns True if the string matches game slug format
 */
export function isValidGameSlug(str: string): boolean {
    const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*-\d{5}$/;
    return slugRegex.test(str);
}

/**
 * Extract game type from slug
 * 
 * @param slug The game slug
 * @returns The game type extracted from the slug
 */
export function getGameTypeFromSlug(slug: string): string {
    if (!isValidGameSlug(slug)) return 'unknown';

    // Remove the counter suffix
    const parts = slug.split('-');
    return parts.slice(0, -1).join('-');
}

/**
 * Get game counter from slug
 * 
 * @param slug The game slug
 * @returns The numeric counter from the slug
 */
export function getGameCounterFromSlug(slug: string): number {
    if (!isValidGameSlug(slug)) return 0;

    const parts = slug.split('-');
    const counterStr = parts[parts.length - 1];
    return parseInt(counterStr, 10);
}

/**
 * Format game time for display
 * 
 * @param seconds Time in seconds
 * @returns Formatted time string (mm:ss)
 */
export function formatGameTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Determine if time is in danger zone (less than 30 seconds)
 * 
 * @param seconds Time in seconds
 * @returns True if time is in danger zone
 */
export function isTimeInDanger(seconds: number): boolean {
    return seconds <= 30 && seconds > 0;
}

/**
 * Generate game URL with proper routing
 * 
 * @param gameId The game UUID
 * @param slug Optional game slug
 * @returns The complete game URL path
 */
export function generateGameUrl(gameId: string, slug?: string): string {
    if (slug) {
        return `/play/game/${gameId}/${slug}`;
    }
    return `/play/game/${gameId}`;
}

/**
 * Parse game URL to extract ID and slug
 * 
 * @param url The game URL path
 * @returns Object with gameId and slug (if present)
 */
export function parseGameUrl(url: string): { gameId?: string; slug?: string } {
    const pathParts = url.split('/');
    const gameIndex = pathParts.findIndex(part => part === 'game');

    if (gameIndex === -1 || gameIndex + 1 >= pathParts.length) {
        return {};
    }

    const gameId = pathParts[gameIndex + 1];
    const slug = pathParts[gameIndex + 2];

    return { gameId, slug };
} 