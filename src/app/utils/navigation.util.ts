import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';

/**
 * Navigation utility service that provides navigation functionality
 * Consolidates both service and mixin patterns into a single utility
 */
@Injectable({ providedIn: 'root' })
export class NavigationUtil {
    private history: string[] = [];

    constructor(
        private router: Router,
        private location: Location
    ) {
        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.history.push(event.urlAfterRedirects);
            }
        });
    }

    // History methods
    public hasPreviousRoute(): boolean {
        return this.history.length > 1;
    }

    public getPreviousUrl(): string | null {
        return this.history.length > 1 ? this.history[this.history.length - 2] : null;
    }

    // Core navigation methods
    public goBack(): void {
        this.location.back();
    }

    public openMenu(): void {
        console.log('Menu clicked');
        // Handle menu logic - could open a side menu or navigate somewhere
    }

    // Handle sidebar navigation
    public handleSidebarNavigation(navigationTarget: string): void {
        console.log('Sidebar navigation clicked:', navigationTarget);
        // Handle navigation logic here
        // For example, you could use Angular Router to navigate to different pages
        // this.router.navigate([`/${navigationTarget}`]);
    }

    // Handle bottom navigation
    public handleBottomNavigation(navigationTarget: string): void {
        console.log('Bottom nav main item clicked:', navigationTarget);
        // Handle main navigation item clicks
    }

    // Handle bottom submenu navigation
    public handleBottomSubmenuNavigation(navigationTarget: string): void {
        console.log('Bottom nav submenu clicked:', navigationTarget);
        // Handle submenu navigation logic here
        // For example, you could use Angular Router to navigate to different pages
        // this.router.navigate([`/${navigationTarget}`]);
    }

    // Navigation to specific routes
    public navigateTo(route: string): void {
        this.router.navigate([route]);
    }

    public navigateToWithParams(route: string, params: any): void {
        this.router.navigate([route], { queryParams: params });
    }
}

/**
 * Navigation mixin for components that need navigation functionality
 * Creates methods that delegate to NavigationUtil
 */
export class NavigationMixin {
    /**
     * Creates navigation methods for a component
     * @param navigationUtil - The navigation utility instance
     * @returns Object with navigation methods
     */
    static createNavigationMethods(navigationUtil: NavigationUtil) {
        return {
            // Navigation Methods - Delegate to NavigationUtil
            onSidebarNavigation: (navigationTarget: string): void => {
                navigationUtil.handleSidebarNavigation(navigationTarget);
            },

            onBottomNavigation: (navigationTarget: string): void => {
                navigationUtil.handleBottomNavigation(navigationTarget);
            },

            onBottomSubmenuNavigation: (navigationTarget: string): void => {
                navigationUtil.handleBottomSubmenuNavigation(navigationTarget);
            },

            // Header Actions - Delegate to NavigationUtil
            goBack: (): void => {
                navigationUtil.goBack();
            },

            openMenu: (): void => {
                navigationUtil.openMenu();
            },

            // Additional navigation methods
            navigateTo: (route: string): void => {
                navigationUtil.navigateTo(route);
            },

            navigateToWithParams: (route: string, params: any): void => {
                navigationUtil.navigateToWithParams(route, params);
            }
        };
    }
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