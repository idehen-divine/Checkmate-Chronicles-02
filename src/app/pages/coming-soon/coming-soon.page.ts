import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trophyOutline, arrowBackOutline } from 'ionicons/icons';

@Component({
	selector: 'app-coming-soon',
	templateUrl: './coming-soon.page.html',
	styleUrls: ['./coming-soon.page.scss'],
	standalone: true,
	imports: [IonContent, IonIcon, IonButton, CommonModule, FormsModule]
})
export class ComingSoonPage implements OnInit {
	showEasterMessage = false;
	private longPressTimer: any;

	constructor(
		private router: Router,
		private location: Location
	) {
		addIcons({ trophyOutline, arrowBackOutline });
	}

	ngOnInit() {
	}
	onGoBack() {
		// Just go back using location - simple navigation doesn't need utility
		this.location.back();
	}

	showEasterEgg() {
		this.showEasterMessage = true;
		setTimeout(() => {
			this.showEasterMessage = false;
		}, 3000);
	}

	onLongPressStart() {
		this.longPressTimer = setTimeout(() => {
			this.showEasterEgg();
		}, 1000);
	}

	onLongPressEnd() {
		if (this.longPressTimer) {
			clearTimeout(this.longPressTimer);
		}
	}
}
