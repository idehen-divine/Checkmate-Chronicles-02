import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { UserPresenceService } from './services/user-presence.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private userPresenceService: UserPresenceService) {
    // Initialize presence system - service handles automatic setup
  }
}
