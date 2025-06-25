import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonButton, LoadingController, AlertController, IonIcon } from '@ionic/angular/standalone';
import { AuthService } from '../../services';

@Component({
	selector: 'app-auth',
	templateUrl: './auth.page.html',
	styleUrls: ['./auth.page.scss'],
	standalone: true,
	imports: [IonContent, IonButton, CommonModule, FormsModule]
})
export class AuthPage {
	isLoading = false;

	constructor(
		private authService: AuthService,
		private router: Router,
		private loadingController: LoadingController,
		private alertController: AlertController
	) { }

	async playAsGuest() {
		// For now, just navigate to dashboard
		// Later we'll implement guest mode
		this.router.navigate(['/dashboard']);
	}

	async signInWithGoogle() {
		const loading = await this.loadingController.create({
			message: 'Signing in with Google...',
			spinner: 'crescent'
		});
		await loading.present();

		try {
			const result = await this.authService.signInWithGoogle();

			if (result.success) {
				// Navigation will be handled by auth state change
				console.log('Google sign in successful');
			} else {
				await this.showError(result.error || 'Failed to sign in with Google');
			}
		} catch (error) {
			await this.showError('An unexpected error occurred');
		} finally {
			await loading.dismiss();
		}
	}

	async signInWithApple() {
		const loading = await this.loadingController.create({
			message: 'Signing in with Apple...',
			spinner: 'crescent'
		});
		await loading.present();

		try {
			const result = await this.authService.signInWithApple();

			if (result.success) {
				// Navigation will be handled by auth state change
				console.log('Apple sign in successful');
			} else {
				await this.showError(result.error || 'Failed to sign in with Apple');
			}
		} catch (error) {
			await this.showError('An unexpected error occurred');
		} finally {
			await loading.dismiss();
		}
	}

	private async showError(message: string) {
		const alert = await this.alertController.create({
			header: 'Sign In Error',
			message: message,
			buttons: ['OK']
		});
		await alert.present();
	}
	async navigate(route: string) {
		this.router.navigate([route]);
	}
}