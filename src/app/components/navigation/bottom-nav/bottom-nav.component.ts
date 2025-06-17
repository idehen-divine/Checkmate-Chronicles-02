import { Component, OnInit, Output, EventEmitter, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IonPopover, IonFooter, IonToolbar, IonButton, IonIcon, IonLabel, IonContent, IonList, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
  standalone: true,
    imports: [IonPopover, IonFooter, IonToolbar, IonButton, IonIcon, IonLabel, IonContent, IonList, IonItem]
})
export class BottomNavComponent implements OnInit, AfterViewInit, OnDestroy {
    @Output() navigationClick = new EventEmitter<string>();
    @Output() submenuClick = new EventEmitter<string>();

    @ViewChild('homePopover') homePopover!: IonPopover;
    @ViewChild('nftPopover') nftPopover!: IonPopover;
    @ViewChild('walletPopover') walletPopover!: IonPopover;
    @ViewChild('socialPopover') socialPopover!: IonPopover;

    private routerSubscription: Subscription = new Subscription();
    private viewInitialized = false;

    // Route mapping for navigation items
    private routeMapping = {
        '/dashboard': 'home',
        '/quick-play': 'home',
        '/tournaments': 'home',
        '/nft-vault': 'nft',
        '/my-nfts': 'nft',
        '/marketplace': 'nft',
        '/wallet': 'wallet',
        '/balance': 'wallet',
        '/history': 'wallet',
        '/friends': 'social',
        '/settings': 'social'
    };

    constructor(private router: Router) { }

    ngOnInit() {
        this.subscribeToRouteChanges();
    }

    ngAfterViewInit() {
        this.viewInitialized = true;
    }

    ngOnDestroy() {
        this.routerSubscription.unsubscribe();
    }

    // Check if a navigation section is active
    isActive(section: string): boolean {
        const currentRoute = this.router.url;
        const activeSection = this.getActiveSectionFromRoute(currentRoute);
        return activeSection === section;
    }

    // Present popover manually
    async presentPopover(event: Event, popoverType: string) {
        if (!this.viewInitialized) {
            return;
        }

        // Close any open popovers first
        await this.closeAllPopovers();

        // Get the popover reference
        let popover: IonPopover | null = null;
        switch (popoverType) {
            case 'home':
                popover = this.homePopover;
                break;
            case 'nft':
                popover = this.nftPopover;
                break;
            case 'wallet':
                popover = this.walletPopover;
                break;
            case 'social':
                popover = this.socialPopover;
                break;
        }

        if (popover) {
            // Set the event as the trigger
            popover.event = event;
            await popover.present();
        }
    }

    async navigateFromPopover(route: string) {
        // Close all popovers
        await this.closeAllPopovers();

        // Emit events for parent components
        this.submenuClick.emit(route);

        // Navigate to the route
        await this.navigate(route);
    }

    private async closeAllPopovers() {
        const popovers = [this.homePopover, this.nftPopover, this.walletPopover, this.socialPopover];

        for (const popover of popovers) {
            if (popover) {
                try {
                    await popover.dismiss();
                } catch (error) {
                    // Popover might already be closed, ignore error
                }
            }
        }
    }

    private subscribeToRouteChanges() {
        this.routerSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                // Active state will be updated automatically by isActive() method
            });
    }

    private getActiveSectionFromRoute(route: string): string | null {
        // Check exact matches first
        if (this.routeMapping[route as keyof typeof this.routeMapping]) {
            return this.routeMapping[route as keyof typeof this.routeMapping];
        }

        // Check for partial matches (for routes with parameters)
        for (const [routePattern, section] of Object.entries(this.routeMapping)) {
            if (route.startsWith(routePattern)) {
                return section;
            }
        }

        return null;
    }

    async navigate(route: string) {
        await this.router.navigate([route]);
    }
}
