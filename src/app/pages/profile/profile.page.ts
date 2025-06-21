import { Component, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { IonContent, IonButton, IonSkeletonText } from '@ionic/angular/standalone';
import { SideBarComponent } from '../../components/navigation/side-bar/side-bar.component';
import { BottomNavComponent } from '../../components/navigation/bottom-nav/bottom-nav.component';
import { UserProfileService, UserStatsService, NFTService, MatchHistoryService } from '../../services';
import { NFTItem, MatchHistoryItem, UserProfile, UserStats } from '../../types';
import { DragScrollUtil, NavigationComponent, DataLoaderUtil } from '../../utils';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-profile',
	templateUrl: './profile.page.html',
	styleUrls: ['./profile.page.scss'],
	standalone: true,
	imports: [
		IonContent,
		// IonButton,
		IonSkeletonText,
		CommonModule,
		FormsModule,
		// SideBarComponent,
		BottomNavComponent
	]
})
export class ProfilePage implements OnInit, OnDestroy, NavigationComponent, AfterViewInit {

	@ViewChild('nftScrollContainer', { static: false }) nftScrollContainer!: ElementRef;

	// User Data
	userProfile: UserProfile | null = null;
	userStats: UserStats | null = null;

	// Loading States
	isLoadingProfile = true;
	isLoadingStats = true;
	isLoadingNFTs = true;
	isLoadingMatches = true;

	// Legacy Profile Data (for backward compatibility)
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

	// Subscriptions
	private subscriptions: Subscription[] = [];	// Utilities
	private dragScrollCleanup?: () => void;
	private dataLoader = new DataLoaderUtil();
	private activeCardCleanup?: () => void;

	constructor(
		private userProfileService: UserProfileService,
		private userStatsService: UserStatsService,
		private nftService: NFTService,
		private matchHistoryService: MatchHistoryService,
		private elementRef: ElementRef,
		private router: Router,
		private location: Location
	) {}

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
		this.subscriptions.forEach(sub => sub.unsubscribe());

		// Cleanup active card detection
		if (this.activeCardCleanup) {
			this.activeCardCleanup();
		}
	}

	private loadProfileData(): void {
		// Load user profile
		this.isLoadingProfile = true;
		const profileSub = this.userProfileService.getUserProfile().subscribe({
			next: (profile) => {
				this.userProfile = profile;
				this.profileName = profile.name;
				this.profileUsername = profile.username;
				this.profileRank = profile.rank;
				this.isLoadingProfile = false;
			},
			error: (error) => {
				console.error('Error loading user profile:', error);
				this.isLoadingProfile = false;
			}
		});
		this.subscriptions.push(profileSub);

		// Load user stats
		this.isLoadingStats = true;
		const statsSub = this.userStatsService.getUserStats().subscribe({
			next: (stats) => {
				this.userStats = stats;
				this.statsWins = stats.wins;
				this.statsLosses = stats.losses;
				this.statsNFTs = stats.nfts;
				this.statsStreak = stats.streak;
				this.statsGames = stats.games;
				this.isLoadingStats = false;
			},
			error: (error) => {
				console.error('Error loading user stats:', error);
				this.isLoadingStats = false;
			}
		});
		this.subscriptions.push(statsSub);

		// Load NFT collection
		this.isLoadingNFTs = true;
		const nftSub = this.nftService.getNFTCollection().subscribe({
			next: (nfts) => {
				this.nftCollection = nfts;
				this.isLoadingNFTs = false;
			},
			error: (error) => {
				console.error('Error loading NFT collection:', error);
				this.isLoadingNFTs = false;
			}
		});
		this.subscriptions.push(nftSub);

		// Load match history
		this.isLoadingMatches = true;
		const matchesSub = this.matchHistoryService.getMatchHistory().subscribe({
			next: (matches) => {
				this.matchHistory = matches;
				this.isLoadingMatches = false;
			},
			error: (error) => {
				console.error('Error loading match history:', error);
				this.isLoadingMatches = false;
			}
		});
		this.subscriptions.push(matchesSub);
	}
	// Navigation Methods - Use the mixin methods
	onSidebarNavigation(navigationTarget: string): void {
		console.log('Sidebar navigation clicked:', navigationTarget);
		this.router.navigate([`/${navigationTarget}`]);
	}

	onBottomNavigation(navigationTarget: string): void {
		console.log('Bottom nav main item clicked:', navigationTarget);
		this.router.navigate([`/${navigationTarget}`]);
	}

	onBottomSubmenuNavigation(navigationTarget: string): void {
		console.log('Bottom nav submenu clicked:', navigationTarget);
		this.router.navigate([`/${navigationTarget}`]);
	}

	// Header Actions - Use the mixin methods
	goBack(): void {
		this.location.back();
	}

	openMenu(): void {
		console.log('Menu clicked');
	}

	// Profile Actions - Call services directly
	editProfile(): void {
		console.log('Edit profile clicked');
		// TODO: Navigate to edit profile page or show edit modal
	}

	viewPublicProfile(): void {
		console.log('View public profile clicked');
		// TODO: Navigate to public profile view
	}

	// Match History Actions
	viewOpponentProfile(opponentId: string): void {
		console.log('Navigating to opponent profile:', opponentId);
		// TODO: Navigate to opponent profile
	}

	// Drag scroll and active card detection methods
	private setupActiveCardDetection(): void {
		const container = this.elementRef.nativeElement.querySelector('.nft-scroll-container');
		if (!container) return;

		const cards = container.querySelectorAll('.nft-card');
		if (cards.length === 0) return;

		let activeIndex = 0;

		const updateActiveCard = (): void => {
			const containerRect = container.getBoundingClientRect();
			const containerCenter = containerRect.left + containerRect.width / 2;

			let closestIndex = 0;
			let closestDistance = Infinity;

			cards.forEach((card: Element, index: number) => {
				const cardRect = card.getBoundingClientRect();
				const cardCenter = cardRect.left + cardRect.width / 2;
				const distance = Math.abs(cardCenter - containerCenter);

				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = index;
				}
			});

			if (closestIndex !== activeIndex) {
				// Remove active class from previous card
				cards[activeIndex]?.classList.remove('active');
				// Add active class to new card
				cards[closestIndex]?.classList.add('active');
				activeIndex = closestIndex;
			}
		};

		// Throttle the scroll handler for better performance
		let scrollTimeout: NodeJS.Timeout;
		const handleScroll = () => {
			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(updateActiveCard, 50);
		};

		// Debounce the resize handler
		let resizeTimeout: NodeJS.Timeout;
		const handleResize = () => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(updateActiveCard, 100);
		};

		// Add event listeners
		container.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', handleResize, { passive: true });

		// Initial update
		updateActiveCard();

		// Store cleanup function
		this.activeCardCleanup = () => {
			container.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleResize);
			clearTimeout(scrollTimeout);
			clearTimeout(resizeTimeout);
		};
	}
}
