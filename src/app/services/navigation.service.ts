import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import * as NavigationUtils from '../utils/navigation.util';

/**
 * Navigation service that provides stateful navigation functionality
 * Uses utility functions for core logic and adds Angular-specific features
 */
@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private history: string[] = [];
    private currentRoute = new BehaviorSubject<string>('');
    public currentRoute$ = this.currentRoute.asObservable();    constructor(
        public router: Router,
        public location: Location
    ) {
        // Track navigation history
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this.history.push(event.urlAfterRedirects);
            this.currentRoute.next(event.urlAfterRedirects);
        });
    }

    // History methods with state management
    hasPreviousRoute(): boolean {
        return this.history.length > 1;
    }

    getPreviousUrl(): string | null {
        return this.history.length > 1 ? this.history[this.history.length - 2] : null;
    }

    getCurrentRoute(): string {
        return this.currentRoute.value;
    }

    // Delegate to utility functions for actual navigation
    navigateTo(route: string): void {
        NavigationUtils.navigateTo(this.router, route);
    }

    navigateToWithParams(route: string, params: any): void {
        NavigationUtils.navigateToWithParams(this.router, route, params);
    }

    goBack(): void {
        NavigationUtils.goBack(this.location);
    }

    openMenu(): void {
        NavigationUtils.openMenu();
    }

    handleSidebarNavigation(navigationTarget: string): void {
        NavigationUtils.handleSidebarNavigation(this.router, navigationTarget);
    }

    handleBottomNavigation(navigationTarget: string): void {
        NavigationUtils.handleBottomNavigation(this.router, navigationTarget);
    }

    handleBottomSubmenuNavigation(navigationTarget: string): void {
        NavigationUtils.handleBottomSubmenuNavigation(this.router, navigationTarget);
    }    // Additional service-specific methods that need observables/state
    isCurrentRoute(route: string): Observable<boolean> {
        return this.currentRoute$.pipe(
            map((currentRoute: string) => currentRoute === route || currentRoute === `/${route}`)
        );
    }    // Clear history (useful for logout)
    clearHistory(): void {
        this.history = [];
    }

    // Create navigation mixin for components
    createNavigationMixin() {
        return NavigationUtils.createNavigationMixin(this.router, this.location);
    }
}
