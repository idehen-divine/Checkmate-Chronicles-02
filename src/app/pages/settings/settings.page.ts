import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import {
	IonContent,
	IonButton,
	IonToggle,
	IonIcon,
	IonSkeletonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline } from 'ionicons/icons';
import { SideBarComponent } from '../../components/navigation/side-bar/side-bar.component';
import { BottomNavComponent } from '../../components/navigation/bottom-nav/bottom-nav.component';
import { HeaderToolbarComponent } from '../../components/navigation/header-toolbar/header-toolbar.component';
import { NavigationComponent, createNavigationMixin } from '../../utils';
import { UserProfileService, UserPreferencesService, AuthService, NavigationService } from '../../services';
import { UserProfile } from '../../types';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.page.html',
	styleUrls: ['./settings.page.scss'],
	standalone: true,
	imports: [
		IonContent,
		IonButton,
		IonToggle,
		IonIcon,
		IonSkeletonText,
		CommonModule,
		FormsModule,
		SideBarComponent,
		BottomNavComponent,
		HeaderToolbarComponent
	]
})
export class SettingsPage implements OnInit, OnDestroy, NavigationComponent {

	// User data
	userProfile: UserProfile | null = null;
	isLoadingProfile = true;
	private subscriptions: Subscription[] = [];

	// User preferences (from database)
	soundsEnabled = true;
	notificationsEnabled = true;
	theme: 'light' | 'dark' | 'system' = 'system';
	allowFriendChallenges = true;

	// Legacy UI preferences (can be moved to custom_data)
	soundEnabled: boolean = true;
	darkModeEnabled: boolean = false;

	// Game preferences
	hintsEnabled = true;
	legalMovesEnabled = true;

	// Notifications
	gameInvitesEnabled = true;
	nftMintsEnabled = true;
	announcementsEnabled = true;

	// Navigation utility
	private navigationMethods: ReturnType<typeof createNavigationMixin>;

	constructor(
		private alertController: AlertController,
		private navigationService: NavigationService,
		private userProfileService: UserProfileService,
		private userPreferencesService: UserPreferencesService,
		private authService: AuthService
	) {
		// Register icons
		addIcons({
			'add-circle-outline': addCircleOutline
		});

		// Initialize navigation methods using the service
		this.navigationMethods = this.navigationService.createNavigationMixin();
	}

	ngOnInit() {
		this.loadUserData();
		this.loadUserPreferences();
	}

	ngOnDestroy() {
		this.subscriptions.forEach(sub => sub.unsubscribe());
	}

	private loadUserData() {
		this.isLoadingProfile = true;
		const profileSub = this.userProfileService.getUserProfile().subscribe({
			next: (profile) => {
				this.userProfile = profile;
				this.isLoadingProfile = false;
			},
			error: (error) => {
				console.error('Error loading user profile:', error);
				this.isLoadingProfile = false;
				// Set default profile on error
				this.userProfile = {
					name: 'Chess Player',
					username: 'player',
					email: undefined,
					rank: 'Beginner | Unranked',
					avatar: 'assets/images/profile-avatar.png'
				};
			}
		});
		this.subscriptions.push(profileSub);
	}

	private loadUserPreferences() {
		const preferencesSub = this.userPreferencesService.getUserPreferences().subscribe({
			next: (preferences) => {
				this.soundsEnabled = preferences.sounds_enabled;
				this.notificationsEnabled = preferences.notifications_enabled;
				this.theme = preferences.theme;
				this.allowFriendChallenges = preferences.allow_friend_challenges;
				// Store other preferences in legacy properties for backward compatibility
				const customData = preferences.custom_data || {};
				this.hintsEnabled = customData.hints_enabled || true;
				this.legalMovesEnabled = customData.legal_moves_enabled || true;
				this.gameInvitesEnabled = customData.game_invites_enabled || true;
				this.nftMintsEnabled = customData.nft_mints_enabled || true;
				this.announcementsEnabled = customData.announcements_enabled || true;
			},
			error: (error) => {
				console.error('Error loading user preferences:', error);
			}
		});
		this.subscriptions.push(preferencesSub);
	}

	private async updatePreferences() {
		const customData = {
			hints_enabled: this.hintsEnabled,
			legal_moves_enabled: this.legalMovesEnabled,
			game_invites_enabled: this.gameInvitesEnabled,
			nft_mints_enabled: this.nftMintsEnabled,
			announcements_enabled: this.announcementsEnabled
		};

		const preferences = {
			sounds_enabled: this.soundsEnabled,
			notifications_enabled: this.notificationsEnabled,
			theme: this.theme,
			allow_friend_challenges: this.allowFriendChallenges,
			custom_data: customData
		};

		const result = await this.userPreferencesService.updateUserPreferences(preferences);
		if (!result.success) {
			console.error('Failed to update preferences:', result.error);
			// Optionally show an error message to the user
		}
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

	// Settings-specific methods with preference updates
	onSoundsToggle() {
		this.updatePreferences();
	}

	onHintsToggle() {
		this.updatePreferences();
	}

	onLegalMovesToggle() {
		this.updatePreferences();
	}

	onGameInvitesToggle() {
		this.updatePreferences();
	}

	onNftMintsToggle() {
		this.updatePreferences();
	}

	onAnnouncementsToggle() {
		this.updatePreferences();
	}

	onNotificationToggle(event: any) {
		this.notificationsEnabled = event.detail.checked;
		console.log('Notifications:', this.notificationsEnabled);
	}

	onSoundToggle(event: any) {
		this.soundEnabled = event.detail.checked;
		console.log('Sound:', this.soundEnabled);
	}

	onDarkModeToggle(event: any) {
		this.darkModeEnabled = event.detail.checked;
		console.log('Dark Mode:', this.darkModeEnabled);
	}

	onConnectWallet() {
		console.log('Connect wallet clicked');
	}

	onDisconnectWallet() {
		console.log('Disconnect wallet clicked');
	}

	onContactSupport() {
		console.log('Contact support clicked');
	}

	onReportBug() {
		console.log('Report bug clicked');
	}

	onPrivacyPolicy() {
		console.log('Privacy policy clicked');
	}

	onTermsOfService() {
		console.log('Terms of service clicked');
	}

	async confirmDeleteAccount() {
		const alert = await this.alertController.create({
			header: 'Delete Account',
			subHeader: 'Are you sure?',
			message: 'This action cannot be undone. All your data will be permanently deleted.',
			buttons: [
				{
					text: 'Cancel',
					role: 'cancel',
					cssClass: 'secondary',
					handler: () => {
						console.log('Delete account cancelled');
					}
				},
				{
					text: 'Delete',
					cssClass: 'danger',
					handler: () => {
						this.deleteAccount();
					}
				}
			]
		});

		await alert.present();
	}

	private deleteAccount() {
		console.log('Account deletion confirmed');
		// TODO: Implement account deletion logic
	}
}