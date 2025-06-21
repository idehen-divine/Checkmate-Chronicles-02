/**
 * Pure utility functions for form validation and handling
 * Use these for lightweight form operations without Angular dependencies
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Check if passwords match
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
}

/**
 * Format form errors for display
 */
export function formatFormErrors(errors: string[]): string {
    return errors.join(', ');
}

/**
 * Check if form field is required and empty
 */
export function isRequired(value: any): boolean {
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}
