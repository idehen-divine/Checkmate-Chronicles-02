import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
    close,
    playBackOutline,
    playSkipBackOutline,
    playSkipForwardOutline,
    playForwardOutline
} from 'ionicons/icons';

@Component({
    selector: 'app-replay-controls',
    templateUrl: './replay-controls.component.html',
    styleUrls: ['./replay-controls.component.scss'],
    imports: [CommonModule, IonicModule],
    standalone: true
})
export class ReplayControlsComponent {
    @Input() isReplayMode: boolean = false;
    @Input() replayPosition: number = 0;
    @Input() replayMovesLength: number = 0;

    @Output() exitReplay = new EventEmitter<void>();
    @Output() goToStart = new EventEmitter<void>();
    @Output() previousMove = new EventEmitter<void>();
    @Output() nextMove = new EventEmitter<void>();
    @Output() goToEnd = new EventEmitter<void>();
    @Output() goToPosition = new EventEmitter<number>();

    constructor() {
        // Add icons for ion-icon to work
        addIcons({
            'close': close,
            'play-back-outline': playBackOutline,
            'play-skip-back-outline': playSkipBackOutline,
            'play-skip-forward-outline': playSkipForwardOutline,
            'play-forward-outline': playForwardOutline
        });
    }

    onExitReplay() {
        this.exitReplay.emit();
    }

    onGoToStart() {
        this.goToStart.emit();
    }

    onPreviousMove() {
        this.previousMove.emit();
    }

    onNextMove() {
        this.nextMove.emit();
    }

    onGoToEnd() {
        this.goToEnd.emit();
    }

    onPositionChange(event: any) {
        const position = +event.target.value;
        this.goToPosition.emit(position);
    }
}
