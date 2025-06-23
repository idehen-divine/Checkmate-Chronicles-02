import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, ToastController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { HeaderToolbarComponent } from '../../../components/navigation/header-toolbar/header-toolbar.component';

@Component({
  selector: 'app-play',
  templateUrl: './play.page.html',
  styleUrls: ['./play.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonIcon,
    CommonModule,
    FormsModule,
    HeaderToolbarComponent
  ]
})
export class PlayPage implements OnInit {

  // Player stats for display
  playerStats = {
    gamesPlayed: 0,
    winRate: 0,
    currentRating: 1200,
    rank: 'Unranked'
  };

  constructor(
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadPlayerStats();
  }

  // Load player statistics
  private loadPlayerStats() {
    // This will be implemented later with actual data from services
    // For now, using mock data
    this.playerStats = {
      gamesPlayed: 12,
      winRate: 67,
      currentRating: 1350,
      rank: 'Bronze II'
    };
  }

  // Navigate to quick match with specified mode
  navigateToQuickMatch(mode: 'ranked' | 'unranked') {
    if (mode === 'ranked') {
      this.router.navigate(['/play/quick-match'], { queryParams: { mode: 'ranked' } });
    } else {
      this.router.navigate(['/play/quick-match'], { queryParams: { mode: 'unranked' } });
    }
  }

  // Navigate to coming soon page for features not yet implemented
  navigateToComingSoon(feature: string) {
    this.router.navigate(['/coming-soon'], {
      queryParams: { feature: feature }
    });
  }

  // Legacy methods - keeping for backwards compatibility but routing to coming-soon
  navigateToPlayWithFriend() {
    this.navigateToComingSoon('Play with Friend');
  }

  navigateToTournaments() {
    this.navigateToComingSoon('Tournament');
  }

  navigateToPlayWithAI() {
    this.navigateToComingSoon('Play with AI');
  }

  // Show coming soon message for features not yet implemented
  async showComingSoon(feature: string) {
    const toast = await this.toastController.create({
      message: `${feature} is coming soon! Stay tuned for updates.`,
      duration: 3000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    toast.present();
  }

}
