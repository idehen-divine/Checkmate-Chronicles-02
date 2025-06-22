import { Injectable, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, interval } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UserPresenceService implements OnDestroy {
    private destroy$ = new Subject<void>();
    private pingInterval: any;
    private currentPage: string = '';
    private isActive: boolean = true;
    private lastActivityTime: number = Date.now();

    // Ping configuration
    private readonly PING_INTERVAL = 10000; // 10 seconds
    private readonly IDLE_THRESHOLD = 30000; // 30 seconds
    private readonly OFFLINE_THRESHOLD = 60000; // 1 minute

    constructor(
        private supabaseService: SupabaseService,
        private authService: AuthService,
        private router: Router
    ) {
        this.initializePresenceSystem();
    }

    private initializePresenceSystem(): void {
        // Track route changes for page context
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntil(this.destroy$)
            )
            .subscribe((event: NavigationEnd) => {
                this.currentPage = event.urlAfterRedirects;
                this.updateActivity('page_navigation');
            });

        // Track user activity events
        this.setupActivityListeners();

        // Start ping system when user is authenticated
        this.authService.user$
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                if (user) {
                    this.startPingSystem();
                } else {
                    this.stopPingSystem();
                }
            });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.handlePageUnload();
        });
    }

    private setupActivityListeners(): void {
        // Track mouse movements, clicks, keyboard input, touch events
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity('user_interaction');
            }, { passive: true });
        });
    }

    private updateActivity(activityType: string): void {
        this.lastActivityTime = Date.now();
        this.isActive = true;
    }

    private startPingSystem(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        // Send initial ping
        this.sendPing('app_start');

        // Set up regular pings
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, this.PING_INTERVAL);
    }

    private stopPingSystem(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private async sendPing(activityType?: string): Promise<void> {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        const timeSinceLastActivity = Date.now() - this.lastActivityTime;

        // Determine activity status
        let status: string;
        if (activityType) {
            status = activityType;
        } else if (timeSinceLastActivity < this.IDLE_THRESHOLD) {
            status = 'active';
        } else {
            status = 'idle';
        }

        try {
            const { data, error } = await this.supabaseService.pingUserActivity(
                user.id,
                status,
                this.currentPage,
                {
                    time_since_last_activity: timeSinceLastActivity,
                    is_page_visible: !document.hidden,
                    user_agent: navigator.userAgent.substring(0, 100) // Truncated for storage
                }
            );

            if (error) {
                console.warn('Failed to send ping:', error);
                // Check if this is a user profile not found error
                await this.authService.handleUserProfileNotFound(error, 'ping_user_activity');
            }
        } catch (error) {
            console.warn('Ping failed:', error);
            // Check if this is a user profile not found error
            await this.authService.handleUserProfileNotFound(error, 'ping_user_activity');
        }
    }

    private handlePageHidden(): void {
        this.isActive = false;
        this.sendPing('page_hidden');
    }

    private handlePageVisible(): void {
        this.isActive = true;
        this.updateActivity('page_visible');
        this.sendPing('page_visible');
    }

    private handlePageUnload(): void {
        // Send synchronous ping on page unload
        const user = this.authService.getCurrentUser();
        if (user) {
            // Use sendBeacon for reliable delivery during page unload
            const pingData = JSON.stringify({
                user_id: user.id,
                activity_type: 'page_unload',
                page_context: this.currentPage,
                timestamp: new Date().toISOString()
            });

            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/ping', pingData);
            }
        }
    }

    // Public methods for manual activity tracking
    public async trackActivity(activityType: string, additionalData?: any): Promise<void> {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        this.updateActivity(activityType);

        try {
            const { data, error } = await this.supabaseService.pingUserActivity(
                user.id,
                activityType,
                this.currentPage,
                additionalData
            );

            if (error) {
                console.warn('Failed to track activity:', error);
                // Check if this is a user profile not found error
                await this.authService.handleUserProfileNotFound(error, 'track_activity');
            }
        } catch (error) {
            console.warn('Failed to track activity:', error);
            // Check if this is a user profile not found error
            await this.authService.handleUserProfileNotFound(error, 'track_activity');
        }
    }

    public async getUserStatus(userId: string): Promise<any> {
        try {
            const { data, error } = await this.supabaseService.getUserActivityStatus(userId);
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    public async getActiveUsersCount(): Promise<number> {
        try {
            const { data, error } = await this.supabaseService.getActiveUsersCount();
            return error ? 0 : (data || 0);
        } catch (error) {
            return 0;
        }
    }

    // Lifecycle methods
    public pause(): void {
        this.stopPingSystem();
    }

    public resume(): void {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.startPingSystem();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.stopPingSystem();
    }
}
