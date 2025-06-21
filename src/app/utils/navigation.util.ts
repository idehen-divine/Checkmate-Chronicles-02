import { Router } from '@angular/router';
import { Location } from '@angular/common';

// Navigation history for tracking navigation state
let navigationHistory: string[] = [];

/**
 * Pure utility functions for navigation
 * Use these for lightweight navigation operations without Angular dependency
 */

/**
 * Navigate to a specific route
 */
export function navigateTo(router: Router, route: string): void {
    router.navigate([route]);
}

/**
 * Navigate to a route with query parameters
 */
export function navigateToWithParams(router: Router, route: string, params: any): void {
    router.navigate([route], { queryParams: params });
}

/**
 * Go back using browser history
 */
export function goBack(location: Location): void {
    location.back();
}

/**
 * Handle menu opening logic
 */
export function openMenu(): void {
    console.log('Menu clicked');
    // Handle menu logic - could trigger an event or call a callback
}

/**
 * Handle sidebar navigation
 */
export function handleSidebarNavigation(router: Router, navigationTarget: string): void {
    console.log('Sidebar navigation clicked:', navigationTarget);
    const route = `/${navigationTarget}`;
    navigateTo(router, route);
}

/**
 * Handle bottom navigation
 */
export function handleBottomNavigation(router: Router, navigationTarget: string): void {
    console.log('Bottom nav main item clicked:', navigationTarget);
    const route = `/${navigationTarget}`;
    navigateTo(router, route);
}

/**
 * Handle bottom submenu navigation
 */
export function handleBottomSubmenuNavigation(router: Router, navigationTarget: string): void {
    console.log('Bottom nav submenu clicked:', navigationTarget);
    const route = `/${navigationTarget}`;
    navigateTo(router, route);
}/**
 * Create a mixin for components that need navigation functionality
 * Use this when you want to add consistent navigation methods to a component
 */
export function createNavigationMixin(router: Router, location: Location) {
    return {
        // Navigation Methods
        onSidebarNavigation: (navigationTarget: string): void => {
            handleSidebarNavigation(router, navigationTarget);
        },

        onBottomNavigation: (navigationTarget: string): void => {
            handleBottomNavigation(router, navigationTarget);
        },

        onBottomSubmenuNavigation: (navigationTarget: string): void => {
            handleBottomSubmenuNavigation(router, navigationTarget);
        },

        // Header Actions
        goBack: (): void => {
            goBack(location);
        },

        openMenu: (): void => {
            openMenu();
        },

        // Direct navigation methods
        navigateTo: (route: string): void => {
            navigateTo(router, route);
        },

        navigateToWithParams: (route: string, params: any): void => {
            navigateToWithParams(router, route, params);
        }
    };
}

/**
 * Interface for components that implement navigation
 */
export interface NavigationComponent {
    onSidebarNavigation(navigationTarget: string): void;
    onBottomNavigation(navigationTarget: string): void;
    onBottomSubmenuNavigation(navigationTarget: string): void;
    goBack(): void;
    openMenu(): void;
    navigateTo?(route: string): void;
    navigateToWithParams?(route: string, params: any): void;
}