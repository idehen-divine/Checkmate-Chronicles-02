import { Component, ViewChild, AfterViewInit, Input } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonPopover, IonContent, IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from '../../../services';

@Component({
    selector: 'app-header-toolbar',
    templateUrl: './header-toolbar.component.html',
    styleUrls: ['./header-toolbar.component.scss'],
    standalone: true,
    imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonPopover, IonContent, IonList, IonItem, IonIcon, IonLabel]
})
export class HeaderToolbarComponent implements AfterViewInit {

    @Input() title: string = 'Checkmate Chronicles'; // Default title
    @ViewChild('profilePopover') profilePopover!: IonPopover;
    private viewInitialized = false;

    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

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
