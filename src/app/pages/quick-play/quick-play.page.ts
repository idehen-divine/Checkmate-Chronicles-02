import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-quick-play',
  templateUrl: './quick-play.page.html',
  styleUrls: ['./quick-play.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class QuickPlayPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
