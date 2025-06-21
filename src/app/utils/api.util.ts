/**
 * Pure utility functions for API response handling
 * Use these for lightweight API operations without Angular dependencies
 */

/**
 * Check if API response has error
 */
export function hasApiError(response: { error: any }): boolean {
    return !!response.error;
}

/**
 * Extract data from API response with fallback
 */
export function extractApiData<T>(response: { data: T | null; error: any }, fallback: T): T {
    if (hasApiError(response) || !response.data) {
        return fallback;
    }
    return response.data;
}

/**
 * Create API success response
 */
export function createSuccessResponse<T>(data: T): { success: boolean; data: T } {
    return { success: true, data };
}

/**
 * Create API error response
 */
export function createErrorResponse(message: string): { success: boolean; error: string } {
    return { success: false, error: message };
}

/**
 * Transform API error to user-friendly message
 */
export function getErrorMessage(error: any): string {
    if (typeof error === 'string') {
        return error;
    }
    
    if (error?.message) {
        return error.message;
    }
    
    if (error?.error) {
        return error.error;
    }
    
    return 'An unexpected error occurred';
}

/**
 * Check if response indicates authentication error
 */
export function isAuthError(error: any): boolean {
    const authErrorCodes = [401, 403, 'UNAUTHORIZED', 'FORBIDDEN'];
    return authErrorCodes.includes(error?.code) || 
           authErrorCodes.includes(error?.status) ||
           error?.message?.toLowerCase().includes('unauthorized') ||
           error?.message?.toLowerCase().includes('forbidden');
}

/**
 * Check if response indicates network error
 */
export function isNetworkError(error: any): boolean {
    return error?.name === 'NetworkError' ||
           error?.message?.toLowerCase().includes('network') ||
           error?.message?.toLowerCase().includes('fetch');
}

/**
 * Retry operation with exponential backoff
 */
export function exponentialBackoff(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}

/**
 * Validate API response structure
 */
export function isValidApiResponse(response: any): boolean {
    return response && typeof response === 'object' && 
           ('data' in response || 'error' in response);
}

/**
 * Transform database row to camelCase
 */
export function transformToCamelCase(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(transformToCamelCase);
    }
    
    const camelCased: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camelCased[camelKey] = transformToCamelCase(value);
    }
    
    return camelCased;
}

/**
 * Transform camelCase to snake_case for database
 */
export function transformToSnakeCase(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(transformToSnakeCase);
    }
    
    const snakeCased: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeCased[snakeKey] = transformToSnakeCase(value);
    }
    
    return snakeCased;
}
