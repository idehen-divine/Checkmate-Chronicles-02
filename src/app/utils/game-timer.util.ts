/**
 * Pure utility functions for game timer functionality
 * These functions handle time formatting and timer calculations without Angular dependencies
 */

/**
 * Format seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Check if time is in danger zone (typically last minute)
 */
export function isDangerTime(timeRemaining: number, dangerThreshold: number = 60): boolean {
	return timeRemaining <= dangerThreshold && timeRemaining > 0;
}

/**
 * Calculate time increment based on time control
 */
export function calculateTimeIncrement(baseTime: number, increment: number): number {
	return baseTime + increment;
}

/**
 * Check if time has expired
 */
export function isTimeExpired(timeRemaining: number): boolean {
	return timeRemaining <= 0;
}

/**
 * Calculate move number from move index
 */
export function getMoveNumber(moveIndex: number): number {
	return Math.floor(moveIndex / 2) + 1;
}

/**
 * Get default time controls for different game types
 */
export function getDefaultTimeControls() {
	return {
		blitz: { initial: 180, increment: 2 }, // 3+2
		rapid: { initial: 600, increment: 5 }, // 10+5
		classical: { initial: 1800, increment: 30 } // 30+30
	};
}
