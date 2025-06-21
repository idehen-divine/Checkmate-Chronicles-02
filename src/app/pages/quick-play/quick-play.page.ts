import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, PopoverController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  chatbubble, 
  ellipsisVertical, 
  bulb, 
  time, 
  settings,
  person,
  checkmark,
  play,
  pencil
} from 'ionicons/icons';
import { HeaderToolbarComponent } from 'src/app/components/navigation/header-toolbar/header-toolbar.component';
import { SupabaseService } from '../../services/supabase.service';

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  ready: boolean;
}

@Component({
  selector: 'app-quick-play',
  templateUrl: './quick-play.page.html',
  styleUrls: ['./quick-play.page.scss'],
  imports: [CommonModule, IonicModule, HeaderToolbarComponent, FormsModule]
})
export class QuickPlayPage implements OnInit, OnDestroy {
  // Game settings
  gameName = 'Quick Play';
  gameMinutes = 15;
  hintsEnabled = false;
  
  // Players
  currentPlayer: Player | null = null;
  opponent: Player | null = null;
  
  // UI state
  isReady = false;
  canClickReady = false;
  gameStarting = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private alertController: AlertController,
    private popoverController: PopoverController,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    addIcons({
      chatbubble,
      ellipsisVertical,
      bulb,
      time,
      settings,
      person,
      checkmark,
      play,
      pencil
    });
  }

  ngOnInit() {
    this.initializePlayer();
    this.simulateOpponentJoining();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private initializePlayer() {
    if (this.supabaseService.user) {
      this.currentPlayer = {
        id: this.supabaseService.user.id,
        username: this.supabaseService.user.user_metadata?.['username'] || 'Player',
        avatar: '/assets/images/profile-avatar.png',
        ready: false
      };
    }
  }

  private simulateOpponentJoining() {
    // Simulate opponent joining after 3 seconds
    setTimeout(() => {
      this.opponent = {
        id: 'opponent-1',
        username: 'ChessMaster',
        avatar: '/assets/images/profile-avatar-large.png',
        ready: false
      };
      this.canClickReady = true;
      this.changeDetectorRef.detectChanges();
    }, 3000);
  }

  async toggleReady() {
    if (!this.canClickReady || this.gameStarting) return;

    this.isReady = !this.isReady;
    if (this.currentPlayer) {
      this.currentPlayer.ready = this.isReady;
    }

    // Simulate opponent also getting ready
    if (this.isReady && this.opponent) {
      setTimeout(() => {
        if (this.opponent) {
          this.opponent.ready = true;
          this.changeDetectorRef.detectChanges();
          this.startGame();
        }
      }, 2000);
    }

    this.changeDetectorRef.detectChanges();
  }

  private async startGame() {
    if (!this.currentPlayer?.ready || !this.opponent?.ready) return;

    this.gameStarting = true;
    
    const alert = await this.alertController.create({
      header: 'Starting Game',
      message: 'Game will start in 3 seconds...',
      backdropDismiss: false,
      buttons: []
    });

    await alert.present();

    let countdown = 3;
    const countdownInterval = setInterval(async () => {
      countdown--;
      if (countdown > 0) {
        alert.message = `Game will start in ${countdown} seconds...`;
      } else {
        clearInterval(countdownInterval);
        await alert.dismiss();
        this.navigateToGame();
      }
    }, 1000);
  }

  private navigateToGame() {
    const gameId = `quick-play-${Date.now()}`;
    this.router.navigate(['/game', gameId], {
      queryParams: {
        minutes: this.gameMinutes,
        hints: this.hintsEnabled,
        gameName: this.gameName
      }
    });
  }

  async openChatComingSoon() {
    const alert = await this.alertController.create({
      header: 'Chat Feature',
      message: 'In-game chat is coming soon! Stay tuned for updates.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async openMoreOptions(event: Event) {
    const popover = await this.popoverController.create({
      component: MoreOptionsPopover,
      event: event,
      translucent: true,
      componentProps: {
        gameName: this.gameName,
        gameMinutes: this.gameMinutes,
        hintsEnabled: this.hintsEnabled,
        onUpdate: (settings: any) => this.updateGameSettings(settings)
      }
    });

    await popover.present();
  }

  private updateGameSettings(settings: any) {
    this.gameName = settings.gameName;
    this.gameMinutes = settings.gameMinutes;
    this.hintsEnabled = settings.hintsEnabled;
    this.changeDetectorRef.detectChanges();
  }

  getGameStatus(): string {
    if (!this.opponent) {
      return 'Waiting for another player to join...';
    }

    if (this.gameStarting) {
      return 'Starting game...';
    }

    if (this.currentPlayer?.ready && this.opponent?.ready) {
      return 'Both players ready! Starting soon...';
    }

    if (this.currentPlayer?.ready) {
      return 'You are ready. Waiting for opponent...';
    }

    if (this.opponent?.ready) {
      return 'Opponent is ready. Click Ready to start!';
    }

    return 'Click Ready when you are prepared to play!';
  }
}

// More Options Popover Component
@Component({
  selector: 'app-more-options-popover',
  template: `
    <ion-content class="more-options-popover">
      <ion-list>
        <ion-item button (click)="editGameName()">
          <ion-icon name="pencil" slot="start"></ion-icon>
          <ion-label>Set Name of Game</ion-label>
        </ion-item>
        <ion-item button (click)="editGameTime()">
          <ion-icon name="time" slot="start"></ion-icon>
          <ion-label>Custom Minutes</ion-label>
        </ion-item>
        <ion-item button (click)="toggleHints()">
          <ion-icon name="bulb" slot="start"></ion-icon>
          <ion-label>{{ hintsEnabled ? 'Disable' : 'Enable' }} Hint</ion-label>
        </ion-item>
        <ion-item button (click)="updatePlayTime()">
          <ion-icon name="time" slot="start"></ion-icon>
          <ion-label>Update Play Time</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .more-options-popover {
      --width: 220px;
    }
  `],
  imports: [IonicModule, CommonModule]
})
export class MoreOptionsPopover {
  gameName: string = '';
  gameMinutes: number = 15;
  hintsEnabled: boolean = false;
  onUpdate: (settings: any) => void = () => {};

  constructor(
    private alertController: AlertController,
    private popoverController: PopoverController
  ) {}

  async editGameName() {
    await this.popoverController.dismiss();
    
    const alert = await this.alertController.create({
      header: 'Set Name of Game',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: this.gameName,
          placeholder: 'Enter game name'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            if (data.name) {
              this.gameName = data.name;
              this.updateSettings();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editGameTime() {
    await this.popoverController.dismiss();
    
    const alert = await this.alertController.create({
      header: 'Custom Minutes',
      inputs: [
        {
          name: 'minutes',
          type: 'number',
          value: this.gameMinutes,
          placeholder: 'Minutes per game',
          min: 1,
          max: 60
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            if (data.minutes && data.minutes > 0) {
              this.gameMinutes = parseInt(data.minutes);
              this.updateSettings();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async updatePlayTime() {
    await this.popoverController.dismiss();
    
    const alert = await this.alertController.create({
      header: 'Update Play Time',
      inputs: [
        {
          name: 'minutes',
          type: 'number',
          value: this.gameMinutes,
          placeholder: 'New time limit',
          min: 1,
          max: 60
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            if (data.minutes && data.minutes > 0) {
              this.gameMinutes = parseInt(data.minutes);
              this.updateSettings();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleHints() {
    await this.popoverController.dismiss();
    this.hintsEnabled = !this.hintsEnabled;
    this.updateSettings();
  }

  private updateSettings() {
    this.onUpdate({
      gameName: this.gameName,
      gameMinutes: this.gameMinutes,
      hintsEnabled: this.hintsEnabled
    });
  }
}
