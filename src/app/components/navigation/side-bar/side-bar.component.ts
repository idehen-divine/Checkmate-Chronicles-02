import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
	selector: 'app-side-bar',
	templateUrl: './side-bar.component.html',
	styleUrls: ['./side-bar.component.scss'],
	standalone: true,
})
export class SideBarComponent implements OnInit, OnDestroy {
	@Output() navigationClick = new EventEmitter<string>();

	activeItem: string = 'dashboard';
	private routerSubscription: Subscription = new Subscription();

	// Route mapping for navigation items
	private routeMapping = {
		'/dashboard': 'dashboard',
		'/quick-play': 'quick-play',
		'/tournaments': 'tournaments',
		'/nft-vault': 'nft-vault',
		'/wallet': 'wallet',
		'/friends': 'friends',
		'/settings': 'settings'
	};

	constructor(private router: Router) { }

	ngOnInit() {
		this.setupNavigation();
		this.subscribeToRouteChanges();

		// Add a small delay to ensure DOM is ready
		setTimeout(() => {
			this.updateActiveStateFromRoute();
		}, 200);
	}

	ngOnDestroy() {
		this.routerSubscription.unsubscribe();
	}

	private setupNavigation() {
		// Wait for DOM to be ready
		setTimeout(() => {
			const navItems = document.querySelectorAll('.desktop-sidebar .nav-item');

			navItems.forEach((item, index) => {
				item.addEventListener('click', (e) => {
					e.preventDefault();

					// Remove active class from all items
					navItems.forEach(navItem => navItem.classList.remove('active'));

					// Add active class to clicked item
					item.classList.add('active');

					// Get the navigation target from the span text
					const spanElement = item.querySelector('span');
					const navigationTarget = spanElement?.textContent?.toLowerCase().replace(' ', '-') || '';

					// Emit navigation event
					this.navigationClick.emit(navigationTarget);
					this.activeItem = navigationTarget;
				});
			});
		}, 100);
	}

	private subscribeToRouteChanges() {
		this.routerSubscription = this.router.events
			.pipe(filter(event => event instanceof NavigationEnd))
			.subscribe((event: NavigationEnd) => {
				this.updateActiveStateFromRoute();
			});
	}

	private updateActiveStateFromRoute() {
		const currentRoute = this.router.url;
		const activeItem = this.getActiveItemFromRoute(currentRoute);

		if (activeItem) {
			this.setActiveItem(activeItem);
		}
	}

	private getActiveItemFromRoute(route: string): string | null {
		// Handle root route
		if (route === '/' || route === '') {
			return 'dashboard';
		}

		// Check exact matches first
		if (this.routeMapping[route as keyof typeof this.routeMapping]) {
			return this.routeMapping[route as keyof typeof this.routeMapping];
		}

		// Check for partial matches (for routes with parameters)
		for (const [routePattern, item] of Object.entries(this.routeMapping)) {
			if (route.startsWith(routePattern)) {
				return item;
			}
		}

		// Default to dashboard if no match found
		return 'dashboard';
	}

	setActiveItem(itemName: string) {
		this.activeItem = itemName;

		// Update DOM active states
		setTimeout(() => {
			const navItems = document.querySelectorAll('.desktop-sidebar .nav-item');

			navItems.forEach(item => {
				const spanElement = item.querySelector('span');
				const itemText = spanElement?.textContent?.toLowerCase().replace(' ', '-') || '';

				if (itemText === itemName) {
					item.classList.add('active');				} else {
					item.classList.remove('active');
				}
			});
		}, 0);
	}

	navigate(route: string) {
		// Use the router directly - simple navigation doesn't need utility
		this.router.navigate([route]);
	}
}
