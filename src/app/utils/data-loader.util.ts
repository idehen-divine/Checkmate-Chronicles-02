import { Observable, Subscription } from 'rxjs';

/**
 * Utility class for managing data loading operations
 * Helps reduce boilerplate code for subscription management
 */
export class DataLoaderUtil {
    private subscriptions: Subscription[] = [];

    /**
     * Loads data from an observable and handles the subscription
     * @param source$ - The observable to subscribe to
     * @param onSuccess - Callback for successful data loading
     * @param onError - Optional error handler
     * @returns The subscription for manual management if needed
     */
    loadData<T>(
        source$: Observable<T>,
        onSuccess: (data: T) => void,
        onError?: (error: any) => void
    ): Subscription {
        const subscription = source$.subscribe({
            next: onSuccess,
            error: onError || ((error) => console.error('Data loading error:', error))
        });

        this.subscriptions.push(subscription);
        return subscription;
    }

    /**
     * Loads multiple data sources in parallel
     * @param loaders - Array of loader configurations
     */
    loadMultiple(loaders: Array<{
        source$: Observable<any>;
        onSuccess: (data: any) => void;
        onError?: (error: any) => void;
    }>): void {
        loaders.forEach(loader => {
            this.loadData(loader.source$, loader.onSuccess, loader.onError);
        });
    }

    /**
     * Unsubscribes from all managed subscriptions
     * Should be called in component's ngOnDestroy
     */
    cleanup(): void {
        this.subscriptions.forEach(sub => {
            if (sub && !sub.closed) {
                sub.unsubscribe();
            }
        });
        this.subscriptions = [];
    }

    /**
     * Gets the number of active subscriptions
     */
    getActiveSubscriptionCount(): number {
        return this.subscriptions.filter(sub => sub && !sub.closed).length;
    }
} 