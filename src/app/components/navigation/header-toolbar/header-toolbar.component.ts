import { Component, ViewChild, AfterViewInit, Input, OnInit, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonPopover, IonContent, IonList, IonItem, IonIcon, IonLabel, IonSkeletonText } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService, UserProfileService } from '../../../services';
import { UserProfile } from '../../../types';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-header-toolbar',
    templateUrl: './header-toolbar.component.html',
    styleUrls: ['./header-toolbar.component.scss'],
    standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonPopover, IonContent, IonList, IonItem, IonIcon, IonLabel, IonSkeletonText, CommonModule]
})
export class HeaderToolbarComponent implements AfterViewInit, OnInit, OnDestroy {

    @Input() title: string|undefined|null = 'Checkmate Chronicles'; // Default title
    @ViewChild('profilePopover') profilePopover!: IonPopover;
    private viewInitialized = false;
    private subscriptions: Subscription[] = [];

    // User data
    userProfile: UserProfile | null = null;
    isLoadingProfile = true;

    constructor(
        private router: Router,
        private authService: AuthService,
        private userProfileService: UserProfileService
    ) { }

    ngOnInit() {
        this.loadUserProfile();
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    private loadUserProfile() {
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

    ngAfterViewInit() {
        this.viewInitialized = true;
    }

    async presentProfilePopover(event: Event) {
        if (!this.viewInitialized || !this.profilePopover) {
            return;
        }
        this.profilePopover.event = event;
        await this.profilePopover.present();
    }

    async navigateFromPopover(route: string) {
        await this.closeAllPopovers();
        await this.router.navigate([route]);
    }

    private async closeAllPopovers() {
        const popover = this.profilePopover;
        if (popover) {
            try {
                await popover.dismiss();
            } catch (error) {
                // Ignore dismiss errors
            }
        }
    }

    async logout() {
        try {
            // Close the popover first
            await this.closeAllPopovers();

            // Perform logout
            const result = await this.authService.signOut();

            if (!result.success) {
                console.error('Logout failed:', result.error);
                // You could show a toast or alert here
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback navigation to auth page
            this.router.navigate(['/auth']);
        }
    }
}
