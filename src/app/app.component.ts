import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonButton } from '@ionic/angular/standalone';
import { UserPresenceService } from './services/user-presence.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonButton, CommonModule],
})
export class AppComponent implements OnInit {
  showReconnectModal = false;

  constructor(private userPresenceService: UserPresenceService) {
    // Initialize presence system - service handles automatic setup
  }

  ngOnInit() {
    // Subscribe to connection status changes
    this.userPresenceService.connectionStatus$.subscribe(isOnline => {
      this.showReconnectModal = !isOnline;
    });
  }

  // Force reload when user manually clicks retry
  forceReload() {
    // Try to check connection first
    this.userPresenceService.forceConnectionCheck();
    
    // Reload after a short delay to allow the connection check
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}
