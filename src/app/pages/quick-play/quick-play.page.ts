import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, PopoverController, ModalController } from '@ionic/angular';
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
  pencil,
  close
} from 'ionicons/icons';
import { HeaderToolbarComponent } from 'src/app/components/navigation/header-toolbar/header-toolbar.component';
import { LobbyToolbarComponent } from 'src/app/components/navigation/game-toolbar/game-toolbar.component';
import { SupabaseService } from '../../services/supabase.service';
import { MatchmakingService, GameType } from '../../services/matchmaking.service';
import { Subscription } from 'rxjs';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon, IonLabel,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonList,
  IonButtons, IonInput, IonCheckbox, IonPopover, IonModal
} from '@ionic/angular/standalone';

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  ready: boolean;
  isHost: boolean;
}

@Component({
  selector: 'app-quick-play',
  templateUrl: './quick-play.page.html',
  styleUrls: ['./quick-play.page.scss'],
  imports: [CommonModule, IonicModule, HeaderToolbarComponent, LobbyToolbarComponent, FormsModule]
})
export class QuickPlayPage implements OnInit, OnDestroy {
  // Game states
  gameState: 'finding-match' | 'lobby' | 'starting' = 'finding-match';

  // Game settings (controlled by host)
  gameName = 'Quick-Play';
  gameMinutes = 15;
  hintsEnabled = false;

  // Players
  currentPlayer: Player | null = null;
  opponent: Player | null = null;
  isHost = false;

  // Game ID from matchmaking
  gameId: string | null = null;

  // UI state
  isReady = false;
  opponentReady = false;
  gameStarting = false;
  matchmakingDots = '';
  chatVisible = false;

  // Subscriptions
  private matchFoundSubscription?: Subscription;
  private queueSubscription?: Subscription;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private matchmakingService: MatchmakingService,
    private alertController: AlertController,
    private popoverController: PopoverController,
    private modalController: ModalController,
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
      pencil,
      close
    });
  }

  ngOnInit() {
    this.initializePlayer();
    this.startRealMatchmaking();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private cleanup() {
    // Leave matchmaking queue
    this.matchmakingService.leaveMatchmakingQueue();

    // Unsubscribe from observables
    if (this.matchFoundSubscription) {
      this.matchFoundSubscription.unsubscribe();
    }
    if (this.queueSubscription) {
      this.queueSubscription.unsubscribe();
    }
  }

  private initializePlayer() {
    if (this.supabaseService.user) {
      this.currentPlayer = {
        id: this.supabaseService.user.id,
        username: this.supabaseService.user.user_metadata?.['username'] || 'Player',
        avatar: '/assets/images/profile-avatar.png',
        ready: false,
        isHost: false
      };
    }
  }

  private startRealMatchmaking() {
    // Animate the loading dots
    const dotsInterval = setInterval(() => {
      this.matchmakingDots = this.matchmakingDots.length >= 3 ? '' : this.matchmakingDots + '.';
      this.changeDetectorRef.detectChanges();
    }, 500);

    // Subscribe to match found events
    this.matchFoundSubscription = this.matchmakingService.subscribeToMatchFound((gameId: string) => {
      clearInterval(dotsInterval);
      this.onMatchFound(gameId);
    });

    // Join the matchmaking queue
    const gameType = this.getGameTypeFromMinutes(this.gameMinutes);

    this.matchmakingService.joinMatchmakingQueue(gameType).catch(error => {
      console.error('Error joining matchmaking queue:', error);
      clearInterval(dotsInterval);
      this.showMatchmakingError();
    });

    // Subscribe to queue status
    this.queueSubscription = this.matchmakingService.inQueue$.subscribe(inQueue => {
      if (!inQueue && this.gameState === 'finding-match') {
        // If we're not in queue anymore but still finding match, there might be an error
        clearInterval(dotsInterval);
      }
    });
  }

  private async onMatchFound(gameId: string) {
    console.log('🎮 Match found! Game ID:', gameId);

    // Store the game ID for navigation
    this.gameId = gameId;

    try {
      // Get game details first
      const { data: game, error: gameError } = await this.supabaseService.db
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        console.error('Error loading game details:', gameError);
        this.showMatchmakingError();
        return;
      }

      // Get player details separately
      const { data: players, error: playersError } = await this.supabaseService.db
        .from('users')
        .select('id, username')
        .in('id', [game.player1_id, game.player2_id]);

      if (playersError || !players || players.length !== 2) {
        console.error('Error loading player details:', playersError);
        this.showMatchmakingError();
        return;
      }

      // Map players to game
      const player1 = players.find(p => p.id === game.player1_id);
      const player2 = players.find(p => p.id === game.player2_id);

      const gameWithPlayers = {
        ...game,
        player1,
        player2
      };

      console.log('🎯 Game data loaded:', gameWithPlayers);

      // Validate game data
      if (!gameWithPlayers.player1 || !gameWithPlayers.player2) {
        console.error('❌ Invalid game data - missing players:', { player1: gameWithPlayers.player1, player2: gameWithPlayers.player2 });
        this.showMatchmakingError();
        return;
      }

      // Determine who is the opponent
      const currentUserId = this.supabaseService.user?.id;
      let opponentData;

      if (gameWithPlayers.player1.id === currentUserId) {
        opponentData = gameWithPlayers.player2;
        this.isHost = true;
      } else {
        opponentData = gameWithPlayers.player1;
        this.isHost = false;
      }

      console.log('👥 Player assignment:', {
        currentUserId,
        player1: gameWithPlayers.player1,
        player2: gameWithPlayers.player2,
        opponentData,
        isHost: this.isHost
      });

      // Set up current player
      if (this.currentPlayer) {
        this.currentPlayer.isHost = this.isHost;
      }

      // Set up opponent
      this.opponent = {
        id: opponentData.id,
        username: opponentData.username,
        avatar: '/assets/images/profile-avatar-large.png',
        ready: false,
        isHost: !this.isHost
      };

      // Switch to lobby state
      this.gameState = 'lobby';
      this.changeDetectorRef.detectChanges();

      console.log('✅ Lobby setup complete:', {
        currentPlayer: this.currentPlayer,
        opponent: this.opponent,
        isHost: this.isHost
      });

    } catch (error) {
      console.error('Error setting up lobby:', error);
      this.showMatchmakingError();
    }
  }

  private async showMatchmakingError() {
    const alert = await this.alertController.create({
      header: 'Matchmaking Error',
      message: 'Unable to join matchmaking queue. Please try again.',
      buttons: [
        {
          text: 'Retry',
          handler: () => this.startRealMatchmaking()
        },
        {
          text: 'Cancel',
          handler: () => this.router.navigate(['/dashboard'])
        }
      ]
    });
    await alert.present();
  }



  async toggleReady() {
    if (this.gameState !== 'lobby' || this.gameStarting) return;

    this.isReady = !this.isReady;
    if (this.currentPlayer) {
      this.currentPlayer.ready = this.isReady;
    }

    // In real implementation, you'd notify the opponent via real-time updates
    // For now, simulate opponent also getting ready after a delay
    if (this.isReady && this.opponent && !this.opponent.ready) {
      setTimeout(() => {
        if (this.opponent) {
          this.opponent.ready = true;
          this.opponentReady = true;
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
    this.gameState = 'starting';

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
    if (!this.gameId) {
      console.error('No game ID available for navigation');
      return;
    }

    console.log('🚀 Navigating to game:', this.gameId);

    // Navigate to the actual game with the real game ID
    this.router.navigate(['/game', this.gameId], {
      queryParams: {
        minutes: this.gameMinutes,
        hints: this.hintsEnabled,
        gameName: this.gameName
      }
    });
  }

  // Bottom Toolbar Actions
  toggleChat() {
    this.chatVisible = !this.chatVisible;
    // TODO: Implement chat panel toggle
    console.log('Chat toggled:', this.chatVisible);
  }

  toggleHints() {
    if (!this.isHost) return;
    this.hintsEnabled = !this.hintsEnabled;
    this.changeDetectorRef.detectChanges();

    // In real implementation, notify opponent of setting change
    console.log('Hints toggled:', this.hintsEnabled);
  }

  async openTimeModal() {
    if (!this.isHost) return;

    const modal = await this.modalController.create({
      component: TimeSelectionComponent,
      componentProps: {
        currentMinutes: this.gameMinutes,
        onTimeSelected: (minutes: number) => this.updateGameTime(minutes)
      }
    });

    await modal.present();
  }

  async openSettingsModal() {
    if (!this.isHost) return;

    const modal = await this.modalController.create({
      component: GameSettingsComponent,
      componentProps: {
        currentName: this.gameName,
        onNameChanged: (name: string) => this.updateGameName(name)
      }
    });

    await modal.present();
  }

  private updateGameTime(minutes: number) {
    this.gameMinutes = minutes;
    this.changeDetectorRef.detectChanges();

    // In real implementation, notify opponent of setting change
    console.log('Game time updated:', minutes);
  }

  private updateGameName(name: string) {
    this.gameName = name;
    this.changeDetectorRef.detectChanges();

    // In real implementation, notify opponent of setting change
    console.log('Game name updated:', name);
  }

  // Legacy methods (keeping for compatibility)
  async openChatComingSoon() {
    const alert = await this.alertController.create({
      header: 'Chat Feature',
      message: 'In-game chat is coming soon! Stay tuned for updates.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async openMoreOptions(event: Event) {
    if (!this.isHost) {
      const alert = await this.alertController.create({
        header: 'Game Settings',
        message: 'Only the host can modify game settings.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const popover = await this.popoverController.create({
      component: MoreOptionsComponent,
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
    if (this.gameState === 'finding-match') {
      return `Finding match${this.matchmakingDots}`;
    }

    if (this.gameState === 'starting') {
      return 'Starting game...';
    }

    if (this.isReady && this.opponentReady) {
      return 'Both players ready! Starting soon...';
    }

    if (this.isReady) {
      return 'You are ready. Waiting for opponent...';
    }

    if (this.opponentReady) {
      return 'Opponent is ready. Click Ready to start!';
    }

    return 'Click Ready when you are prepared to play!';
  }

  getHostIndicator(): string {
    if (this.isHost) {
      return 'You are the host - you can modify game settings';
    } else {
      return 'You are the guest - host controls game settings';
    }
  }

  canClickReady(): boolean {
    return this.gameState === 'lobby' && !this.gameStarting;
  }

  // Add method to handle back navigation
  async onBackPressed() {
    if (this.gameState === 'finding-match') {
      const alert = await this.alertController.create({
        header: 'Leave Matchmaking?',
        message: 'Are you sure you want to stop looking for a match?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Leave',
            handler: () => {
              this.cleanup();
              this.router.navigate(['/dashboard']);
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private getGameTypeFromMinutes(minutes: number): GameType {
    if (minutes <= 3) {
      return 'bullet';
    } else if (minutes <= 10) {
      return 'blitz';
    } else if (minutes <= 30) {
      return 'rapid';
    } else {
      return 'classical';
    }
  }
}

// Time Selection Modal Component
@Component({
  selector: 'app-time-selection-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Select Game Time</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="time-modal-content">
      <div class="time-options">
        <ion-button 
          *ngFor="let option of timeOptions" 
          expand="block" 
          fill="outline"
          [color]="option.minutes === currentMinutes ? 'primary' : 'medium'"
          (click)="selectTime(option.minutes)"
          class="time-option">
          <div class="time-info">
            <h3>{{ option.label }}</h3>
            <p>{{ option.minutes }} minutes</p>
          </div>
        </ion-button>
      </div>
      
      <div class="custom-time">
        <ion-item>
          <ion-label position="stacked">Custom Minutes</ion-label>
          <ion-input 
            type="number" 
            [(ngModel)]="customMinutes" 
            min="1" 
            max="60"
            placeholder="Enter minutes">
          </ion-input>
        </ion-item>
        <ion-button 
          expand="block" 
          (click)="selectTime(customMinutes)"
          [disabled]="!customMinutes || customMinutes < 1 || customMinutes > 60">
          Set Custom Time
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .time-modal-content {
      padding: 20px;
    }
    
    .time-options {
      margin-bottom: 30px;
    }
    
    .time-option {
      margin-bottom: 12px;
      height: auto;
      
      .time-info {
        text-align: left;
        padding: 8px 0;
        
        h3 {
          margin: 0 0 4px;
          font-weight: 600;
        }
        
        p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.7;
        }
      }
    }
    
    .custom-time {
      border-top: 1px solid var(--ion-color-step-200);
      padding-top: 20px;
      
      ion-button {
        margin-top: 16px;
      }
    }
  `],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TimeSelectionComponent {
  currentMinutes: number = 15;
  customMinutes: number = 15;
  onTimeSelected: (minutes: number) => void = () => { };

  timeOptions = [
    { label: 'Bullet', minutes: 3 },
    { label: 'Blitz', minutes: 5 },
    { label: 'Rapid', minutes: 15 },
    { label: 'Classical', minutes: 30 }
  ];

  constructor(private modalController: ModalController) { }

  async dismiss() {
    await this.modalController.dismiss();
  }

  async selectTime(minutes: number) {
    if (minutes && minutes > 0 && minutes <= 60) {
      this.onTimeSelected(minutes);
      await this.modalController.dismiss();
    }
  }
}

// Game Settings Modal Component
@Component({
  selector: 'app-game-settings-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Game Settings</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="settings-modal-content">
      <ion-item>
        <ion-label position="stacked">Game Name</ion-label>
        <ion-input 
          [(ngModel)]="gameName" 
          placeholder="Enter game name"
          maxlength="30">
        </ion-input>
      </ion-item>
      
      <div class="modal-actions">
        <ion-button 
          expand="block" 
          (click)="saveSettings()"
          [disabled]="!gameName || gameName.trim().length === 0">
          Save Settings
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .settings-modal-content {
      padding: 20px;
    }
    
    .modal-actions {
      margin-top: 30px;
    }
  `],
  imports: [IonicModule, CommonModule, FormsModule]
})
export class GameSettingsComponent {
  gameName: string = '';
  onNameChanged: (name: string) => void = () => { };

  constructor(private modalController: ModalController) { }

  async dismiss() {
    await this.modalController.dismiss();
  }

  async saveSettings() {
    if (this.gameName && this.gameName.trim().length > 0) {
      this.onNameChanged(this.gameName.trim());
      await this.modalController.dismiss();
    }
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
export class MoreOptionsComponent {
  gameName: string = '';
  gameMinutes: number = 15;
  hintsEnabled: boolean = false;
  onUpdate: (settings: any) => void = () => { };

  constructor(
    private alertController: AlertController,
    private popoverController: PopoverController
  ) { }

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
