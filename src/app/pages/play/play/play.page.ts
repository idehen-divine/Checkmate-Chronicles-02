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

  constructor(
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
  }

  navigateToQuickMatch() {
    this.router.navigate(['/quick-play']);
  }

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
