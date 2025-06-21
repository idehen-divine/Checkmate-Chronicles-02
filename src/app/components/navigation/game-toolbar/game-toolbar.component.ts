import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
	playCircleOutline,
	reloadOutline,
	bulbOutline,
	closeCircleOutline,
	chatbubbleEllipsesOutline
} from 'ionicons/icons';

@Component({
	selector: 'app-game-toolbar',
	templateUrl: './game-toolbar.component.html',
	styleUrls: ['./game-toolbar.component.scss'],
	imports: [CommonModule, IonicModule],
	standalone: true
})
export class GameToolbarComponent {
	@Input() gameEnded: boolean = false;
	@Input() canUndo: boolean = false;
	@Input() canRedo: boolean = false;

	@Output() chatClick = new EventEmitter<void>();
	@Output() abortClick = new EventEmitter<void>();
	@Output() hintClick = new EventEmitter<void>();
	@Output() undoClick = new EventEmitter<void>();
	@Output() redoClick = new EventEmitter<void>();
	@Output() replayClick = new EventEmitter<void>();

	constructor() {    // Add icons for ion-icon to work
		addIcons({
			'play-circle-outline': playCircleOutline,
			'reload-outline': reloadOutline,
			'bulb-outline': bulbOutline,
			'close-circle-outline': closeCircleOutline,
			'chatbubble-ellipses-outline': chatbubbleEllipsesOutline
		});
	}

	onChatClick() {
		this.chatClick.emit();
	}

	onAbortClick() {
		this.abortClick.emit();
	}

	onHintClick() {
		this.hintClick.emit();
	}

	onUndoClick() {
		this.undoClick.emit();
	}

	onRedoClick() {
		this.redoClick.emit();
	}

	onReplayClick() {
		this.replayClick.emit();
	}
}
