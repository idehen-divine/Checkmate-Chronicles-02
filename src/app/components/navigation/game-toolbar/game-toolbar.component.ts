import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
	playCircleOutline,
	reloadOutline,
	bulbOutline,
	closeCircleOutline,
	chatbubbleEllipsesOutline,
	timeOutline,
	settingsOutline
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
			'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
			'time-outline': timeOutline,
			'settings-outline': settingsOutline
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

// New Lobby Toolbar Component
@Component({
	selector: 'app-lobby-toolbar',
	template: `
		<div class="game-action-bar">
			<button class="action-btn" (click)="onChatClick()" [class.active]="chatActive">
				<ion-icon name="chatbubble-ellipses-outline"></ion-icon>
				<span>Chat</span>
			</button>
			<button class="action-btn" (click)="onHintClick()" [disabled]="!isHost" [class.active]="hintsEnabled">
				<ion-icon name="bulb-outline"></ion-icon>
				<span>Hint</span>
			</button>
			<button class="action-btn" (click)="onTimeClick()" [disabled]="!isHost">
				<ion-icon name="time-outline"></ion-icon>
				<span>Time</span>
			</button>
			<button class="action-btn" (click)="onSettingsClick()" [disabled]="!isHost">
				<ion-icon name="settings-outline"></ion-icon>
				<span>Settings</span>
			</button>
		</div>
	`,
	styleUrls: ['./game-toolbar.component.scss'],
	imports: [CommonModule, IonicModule],
	standalone: true
})
export class LobbyToolbarComponent {
	@Input() isHost: boolean = false;
	@Input() chatActive: boolean = false;
	@Input() hintsEnabled: boolean = false;

	@Output() chatClick = new EventEmitter<void>();
	@Output() hintClick = new EventEmitter<void>();
	@Output() timeClick = new EventEmitter<void>();
	@Output() settingsClick = new EventEmitter<void>();

	constructor() {
		addIcons({
			'bulb-outline': bulbOutline,
			'chatbubble-ellipses-outline': chatbubbleEllipsesOutline,
			'time-outline': timeOutline,
			'settings-outline': settingsOutline
		});
	}

	onChatClick() {
		this.chatClick.emit();
	}

	onHintClick() {
		this.hintClick.emit();
	}

	onTimeClick() {
		this.timeClick.emit();
	}

	onSettingsClick() {
		this.settingsClick.emit();
	}
}
