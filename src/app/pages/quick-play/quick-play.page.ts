import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { play, time, trophy, gameController } from 'ionicons/icons';
import { HeaderToolbarComponent } from 'src/app/components/navigation/header-toolbar/header-toolbar.component';
import { MatchmakingService, GameMode, TimeControl } from '../../services/matchmaking.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quick-play',
  templateUrl: './quick-play.page.html',
  styleUrls: ['./quick-play.page.scss'],
  imports: [CommonModule, IonicModule, HeaderToolbarComponent, FormsModule]
})
export class QuickPlayPage implements OnInit, OnDestroy {
  selectedGameMode: GameMode = 'quick-match';
  isInQueue = false;
  queueTime = 0;
  private queueTimer?: any;
  private subscriptions: Subscription[] = [];

  // Game mode options
  gameModeOptions = [
    {
      value: 'quick-match' as GameMode,
      label: 'Quick Match',
      description: 'Find a match quickly',
      icon: 'play',
      color: 'primary'
    },
    {
      value: 'ranked' as GameMode,
      label: 'Ranked',
      description: 'Competitive rated games',
      icon: 'trophy',
      color: 'warning'
    },
    {
      value: 'casual' as GameMode,
      label: 'Casual',
      description: 'Relaxed unrated games',
      icon: 'game-controller',
      color: 'success'
    }
  ];

  constructor(
    private matchmakingService: MatchmakingService,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ play, time, trophy, gameController });
  }

  ngOnInit() {
    // Subscribe to queue status
    this.subscriptions.push(
      this.matchmakingService.inQueue$.subscribe((inQueue: boolean) => {
        this.isInQueue = inQueue;
        if (inQueue) {
          this.startQueueTimer();
        } else {
          this.stopQueueTimer();
        }
      })
    );

    // Subscribe to match found
    this.subscriptions.push(
      this.matchmakingService.matchFound$.subscribe((gameId: string | null) => {
        if (gameId) {
          this.handleMatchFound(gameId);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopQueueTimer();
  }

  async startMatchmaking() {
    try {
      const loading = await this.loadingController.create({
        message: 'Joining queue...',
        spinner: 'circles'
      });
      await loading.present();

      await this.matchmakingService.joinMatchmakingQueue(this.selectedGameMode);

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: `Searching for ${this.getGameModeLabel(this.selectedGameMode)} opponents...`,
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('Error starting matchmaking:', error);

      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Failed to join matchmaking queue. Please try again.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async cancelMatchmaking() {
    try {
      const loading = await this.loadingController.create({
        message: 'Leaving queue...',
        spinner: 'circles'
      });
      await loading.present();

      await this.matchmakingService.leaveMatchmakingQueue();

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: 'Left matchmaking queue',
        duration: 2000,
        position: 'top',
        color: 'medium'
      });
      await toast.present();

    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  }

  private startQueueTimer() {
    this.queueTime = 0;
    this.queueTimer = setInterval(() => {
      this.queueTime++;
    }, 1000);
  }

  private stopQueueTimer() {
    if (this.queueTimer) {
      clearInterval(this.queueTimer);
      this.queueTimer = undefined;
    }
    this.queueTime = 0;
  }

  private async handleMatchFound(gameId: string) {
    this.stopQueueTimer();

    const toast = await this.toastController.create({
      message: 'Match found! Redirecting to game...',
      duration: 2000,
      position: 'top',
      color: 'success'
    });
    await toast.present();

    // Navigate to game
    this.router.navigate(['/game', gameId]);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getGameModeLabel(gameMode: GameMode): string {
    const option = this.gameModeOptions.find(opt => opt.value === gameMode);
    return option?.label || gameMode;
  }

  // Helper method to get time control from minutes (for backward compatibility)
  getTimeControlFromMinutes(minutes: number): TimeControl {
    return this.matchmakingService.getTimeControlFromMinutes(minutes);
  }
}
