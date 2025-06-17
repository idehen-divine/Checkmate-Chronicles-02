import { Component, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { SideBarComponent } from '../../components/navigation/side-bar/side-bar.component';
import { BottomNavComponent } from '../../components/navigation/bottom-nav/bottom-nav.component';
import { ProfileService } from '../../services';
import { NFTItem, MatchHistoryItem } from '../../types';
import { DragScrollUtil, NavigationUtil, NavigationMixin, NavigationComponent, DataLoaderUtil } from '../../utils';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
	imports: [
		IonContent,
		IonButton,
		CommonModule,
		FormsModule,
		SideBarComponent,
		BottomNavComponent
	]
})
export class ProfilePage implements OnInit, OnDestroy, NavigationComponent, AfterViewInit {

	@ViewChild('nftScrollContainer', { static: false }) nftScrollContainer!: ElementRef;

	// Profile Data
	profileName: string = '';
	profileUsername: string = '';
	profileRank: string = '';

	// Stats Data
	statsWins: string = '';
	statsLosses: number = 0;
	statsNFTs: number = 0;
	statsStreak: number = 0;
	statsGames: number = 0;

	// Collections
	nftCollection: NFTItem[] = [];
	matchHistory: MatchHistoryItem[] = [];

	// Utilities
	private dragScrollCleanup?: () => void;
	private dataLoader = new DataLoaderUtil();
	private navigationMethods: ReturnType<typeof NavigationMixin.createNavigationMethods>;
	private activeCardCleanup?: () => void;

	constructor(
		private profileService: ProfileService,
		private navigationUtil: NavigationUtil,
		private elementRef: ElementRef
	) {
		// Initialize navigation methods using the mixin
		this.navigationMethods = NavigationMixin.createNavigationMethods(this.navigationUtil);
	}

  ngOnInit() {
		this.loadProfileData();
	}

	ngAfterViewInit() {
		// Add a small delay to ensure DOM is fully rendered
		setTimeout(() => {
			const container = this.elementRef.nativeElement.querySelector('.nft-scroll-container');
			if (container) {
				this.dragScrollCleanup = DragScrollUtil.setupDragScroll(container, {
					mouseSpeed: 1,
					touchSpeed: 0.6,
					disableOnMobile: true,
					mobileBreakpoint: 1024
				});

				// Set up active card detection for mobile
				this.setupActiveCardDetection();
			}
		}, 100);
	}

	ngOnDestroy() {
		// Cleanup drag scroll listeners
		if (this.dragScrollCleanup) {
			this.dragScrollCleanup();
		}

		// Cleanup data subscriptions
		this.dataLoader.cleanup();

		// Cleanup active card detection
		if (this.activeCardCleanup) {
			this.activeCardCleanup();
		}
	}

	private loadProfileData(): void {
		// Use the data loader utility to manage subscriptions
		this.dataLoader.loadMultiple([
			{
				source$: this.profileService.getUserProfile(),
				onSuccess: (profile) => {
					this.profileName = profile.name;
					this.profileUsername = profile.username;
					this.profileRank = profile.rank;
				}
			},
			{
				source$: this.profileService.getUserStats(),
				onSuccess: (stats) => {
					this.statsWins = stats.wins;
					this.statsLosses = stats.losses;
					this.statsNFTs = stats.nfts;
					this.statsStreak = stats.streak;
					this.statsGames = stats.games;
				}
			},
			{
				source$: this.profileService.getNFTCollection(),
				onSuccess: (nfts) => {
					this.nftCollection = nfts;
				}
			},
			{
				source$: this.profileService.getMatchHistory(),
				onSuccess: (matches) => {
					this.matchHistory = matches;
				}
			}
		]);
	}

	// Navigation Methods - Use the mixin methods
	onSidebarNavigation(navigationTarget: string): void {
		this.navigationMethods.onSidebarNavigation(navigationTarget);
	}

	onBottomNavigation(navigationTarget: string): void {
		this.navigationMethods.onBottomNavigation(navigationTarget);
	}

	onBottomSubmenuNavigation(navigationTarget: string): void {
		this.navigationMethods.onBottomSubmenuNavigation(navigationTarget);
	}

	// Header Actions - Use the mixin methods
	goBack(): void {
		this.navigationMethods.goBack();
	}

	openMenu(): void {
		this.navigationMethods.openMenu();
	}

	// Profile Actions - Delegate to ProfileService
	editProfile(): void {
		this.profileService.editProfile();
	}

	viewPublicProfile(): void {
		this.profileService.viewPublicProfile();
	}

	// Match History Actions - Delegate to ProfileService
	viewOpponentProfile(opponentId: string): void {
		this.profileService.viewOpponentProfile(opponentId);
	}

	/**
	 * Sets up active card detection using scroll position for better reliability
	 */
	private setupActiveCardDetection(): void {
		// Only set up on mobile screen sizes
		if (window.innerWidth >= 1024) return;

		const container = this.elementRef.nativeElement.querySelector('.nft-scroll-container') as HTMLElement;
		const cards = this.elementRef.nativeElement.querySelectorAll('.nft-card') as NodeListOf<HTMLElement>;

		if (!container || !cards.length) {
			return;
		}

		// Function to update active card based on scroll position
		const updateActiveCard = (): void => {
			const containerRect = container.getBoundingClientRect();
			const containerCenter = containerRect.left + containerRect.width / 2;

			let closestCard: HTMLElement | undefined;
			let closestDistance = Infinity;

			// Find the card closest to the center of the container
			cards.forEach((card: HTMLElement) => {
				const cardRect = card.getBoundingClientRect();
				const cardCenter = cardRect.left + cardRect.width / 2;
				const distance = Math.abs(cardCenter - containerCenter);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestCard = card;
				}
			});

			// Remove active class from all cards
			cards.forEach((card: HTMLElement) => {
				card.classList.remove('active-card');
			});

			// Add active class to the closest card
			if (closestCard) {
				closestCard.classList.add('active-card');
			}
		};

		// Initial update
		updateActiveCard();

		// Listen for scroll events
		let scrollTimeout: any;
		const handleScroll = () => {
			// Clear previous timeout
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}

			// Update immediately for smooth experience
			updateActiveCard();

			// Also update after scroll ends for accuracy
			scrollTimeout = setTimeout(updateActiveCard, 150);
		};

		container.addEventListener('scroll', handleScroll, { passive: true });

		// Listen for window resize to reinitialize
		const handleResize = () => {
			// Only reinitialize if still on mobile
			if (window.innerWidth < 1024) {
				setTimeout(updateActiveCard, 100);
			} else {
				// Remove all active classes on desktop
				cards.forEach((card: HTMLElement) => {
					card.classList.remove('active-card');
				});
			}
		};

		window.addEventListener('resize', handleResize);

		// Store cleanup function
		this.activeCardCleanup = () => {
			container.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleResize);
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
		};
	}
}
