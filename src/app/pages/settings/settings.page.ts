import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import {
	IonContent,
	IonButton,
	IonToggle,
	IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline } from 'ionicons/icons';
import { SideBarComponent } from '../../components/navigation/side-bar/side-bar.component';
import { BottomNavComponent } from '../../components/navigation/bottom-nav/bottom-nav.component';
import { HeaderToolbarComponent } from '../../components/navigation/header-toolbar/header-toolbar.component';
import { NavigationUtil, NavigationMixin, NavigationComponent } from '../../utils';

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
		CommonModule,
		FormsModule,
		SideBarComponent,
		BottomNavComponent,
		HeaderToolbarComponent
	]
})
export class SettingsPage implements OnInit, NavigationComponent {

	// Profile and assets
	profileImage = "assets/images/profile-avatar.png";

	// Game preferences
	soundsEnabled = true;
	hintsEnabled = true;
	legalMovesEnabled = true;

	// Notifications
	gameInvitesEnabled = true;
	nftMintsEnabled = true;
	announcementsEnabled = true;

	// Settings state
	notificationsEnabled: boolean = true;
	soundEnabled: boolean = true;
	darkModeEnabled: boolean = true;

	// Navigation utility
	private navigationMethods: ReturnType<typeof NavigationMixin.createNavigationMethods>;

	constructor(
		private alertController: AlertController,
		private navigationUtil: NavigationUtil
	) {
		// Register icons
		addIcons({
			'add-circle-outline': addCircleOutline
		});

		// Initialize navigation methods using the mixin
		this.navigationMethods = NavigationMixin.createNavigationMethods(this.navigationUtil);
	}

	ngOnInit() {
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

	// Settings-specific methods
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
			message: 'Are you sure you want to delete your account? This action cannot be undone.',
			buttons: [
				{
					text: 'Cancel',
					role: 'cancel'
				},
				{
					text: 'Delete',
					role: 'destructive',
					handler: () => {
						// Handle account deletion
						console.log('Account deletion confirmed');
					}
				}
			]
		});

		await alert.present();
	}
}
