import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, warningOutline, arrowBackOutline } from 'ionicons/icons';

@Component({
	selector: 'app-not-found',
	templateUrl: './not-found.page.html',
	styleUrls: ['./not-found.page.scss'],
	standalone: true,
	imports: [IonContent, IonIcon, IonButton, CommonModule, FormsModule]
})
export class NotFoundPage implements OnInit, OnDestroy {
	showEasterEgg = false;
	private easterEggTimer: any;
	constructor(
		private router: Router,
		private location: Location
	) {
		addIcons({ homeOutline, warningOutline, arrowBackOutline });
	}

	ngOnInit() {
		// Show easter egg after 5 seconds
		this.easterEggTimer = setTimeout(() => {
			this.showEasterEgg = true;
			// Hide it after 4 seconds
			setTimeout(() => {
				this.showEasterEgg = false;
			}, 4000);
		}, 5000);
	}

	ngOnDestroy() {
		if (this.easterEggTimer) {
			clearTimeout(this.easterEggTimer);
		}
	}

	onGoHome() {
		this.router.navigate(['/dashboard']);
	}
	onGoBack() {
		// Just go back using location
		this.location.back();
	}

	onReportIssue() {
		// TODO: Implement issue reporting functionality
		console.log('Report issue clicked');
		this.router.navigate(['/coming-soon']);
	}
}
