import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Chess } from 'chess.js';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
	timeOutline,
	close,
	playBack,
	playSkipBack,
	playSkipForward,
	playForward
} from 'ionicons/icons';
import { HeaderToolbarComponent } from 'src/app/components/navigation/header-toolbar/header-toolbar.component';
import { GameToolbarComponent } from 'src/app/components/navigation/game-toolbar/game-toolbar.component';
import { ReplayControlsComponent } from 'src/app/components/game/replay-controls/replay-controls.component';
import { LiveGameMove, LiveGamePlayer } from '../../types/game.types';
import { GameTimerService } from '../../services/game-timer.service';
import { NotificationService } from '../../services/notification.service';
import { ChessReplayService } from '../../services/chess-replay.service';
import * as ChessBoardUtils from '../../utils/chess-board.util';
import * as GameTimerUtils from '../../utils/game-timer.util';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-game',
	templateUrl: './game.page.html',
	styleUrls: ['./game.page.scss'],
	imports: [CommonModule, IonicModule, HeaderToolbarComponent, GameToolbarComponent, ReplayControlsComponent]
})
export class GamePage implements OnInit, OnDestroy {
	chess = new Chess();
	gameId = 'Game #123456';
	board: (string | null)[][] = [];
	selectedSquare: string | null = null;
	possibleMoves: string[] = [];
	gameHistory: LiveGameMove[] = [];
	undoneHistory: LiveGameMove[] = []; // Track undone moves for redo functionality
	hasUndoneMove = false; // Track if current player has already undone a move
	isPlayerTurn = true;
	gameStatus = 'active'; // active, check, checkmate, stalemate, draw
	gameEnded = false; // Add flag to prevent multiple dialogs

	player1: LiveGamePlayer = {
		id: '1',
		username: 'chessfreak',
		avatar: '/assets/images/profile-avatar.png',
		walletAddress: '0x4f...2a9c',
		timeRemaining: 60,
		rating: 1850,
		rank: 'Expert',
		isOnline: true
	};

	player2: LiveGamePlayer = {
		id: '2',
		username: 'QueenOfPlays',
		avatar: '/assets/images/profile-avatar.png',
		walletAddress: '0x7b...8d5e',
		timeRemaining: 60,
		rating: 1920,
		rank: 'Expert',
		isOnline: true
	};

	currentPlayer: LiveGamePlayer;

	// Drag and drop properties
	draggedPiece: { row: number; col: number; piece: string } | null = null;
	isDragging = false;
	// Replay functionality properties
	isReplayMode = false;
	replayPosition = 0;
	replayMoves: any[] = [];
	originalGameState: any = null;

	private subscriptions: Subscription[] = [];

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private changeDetectorRef: ChangeDetectorRef,
		private gameTimerService: GameTimerService,
		private notificationService: NotificationService,
		private chessReplayService: ChessReplayService
	) {
		this.currentPlayer = this.player1;
		// Add icons for ion-icon to work
		addIcons({
			'time-outline': timeOutline,
			'close': close,
			'play-back': playBack,
			'play-skip-back': playSkipBack,
			'play-skip-forward': playSkipForward,
			'play-forward': playForward
		});
	}
	ngOnInit() {
		this.initializeBoard();
		this.startTimer();

		// Get game ID from route if available
		this.route.params.subscribe(params => {
			if (params['id']) {
				this.gameId = `Game #${params['id']}`;
			}
		});

		// Subscribe to replay state changes
		const replaySubscription = this.chessReplayService.replayState$.subscribe(replayState => {
			this.isReplayMode = replayState.isReplayMode;
			this.replayPosition = replayState.position;
			this.replayMoves = replayState.moves;
			this.originalGameState = replayState.originalGameState;

			if (this.isReplayMode) {
				this.replayToPosition(replayState.position);
			}
		});

		this.subscriptions.push(replaySubscription);
	}

	ngOnDestroy() {
		this.gameTimerService.stopTimer();
		this.subscriptions.forEach(sub => sub.unsubscribe());
	}

	initializeBoard() {
		this.updateBoard();
		this.updateGameHistory();
	}
	updateBoard() {
		this.board = ChessBoardUtils.createBoardFromFen(this.chess);
	} updateGameHistory() {
		const history = this.chess.history({ verbose: true });

		// Only update if the history has actually changed to avoid overwriting our custom history
		if (history.length !== this.gameHistory.length) {
			this.gameHistory = history.map((move, index) => ({
				notation: move.san,
				timestamp: new Date(),
				from: move.from,
				to: move.to,
				playerId: index % 2 === 0 ? this.player1.id : this.player2.id,
				promotion: move.promotion
			}));
		}
	}
	getSquareNotation(row: number, col: number): string {
		return ChessBoardUtils.getSquareNotation(row, col);
	}

	isSquareLight(row: number, col: number): boolean {
		return ChessBoardUtils.isSquareLight(row, col);
	}

	isSquareSelected(row: number, col: number): boolean {
		return this.selectedSquare === this.getSquareNotation(row, col);
	}

	isSquareHighlighted(row: number, col: number): boolean {
		const square = this.getSquareNotation(row, col);
		return this.possibleMoves.includes(square);
	}

	isSquareInCheck(row: number, col: number): boolean {
		const square = this.getSquareNotation(row, col);
		const piece = this.chess.get(square as any);

		// Check if this square contains the king that is in check
		return !!(piece && piece.type === 'k' &&
			((piece.color === 'w' && this.chess.inCheck() && this.chess.turn() === 'w') ||
				(piece.color === 'b' && this.chess.inCheck() && this.chess.turn() === 'b')));
	}

	isCurrentPlayerPiece(row: number, col: number): boolean {
		const square = this.getSquareNotation(row, col);
		const piece = this.chess.get(square as any);

		if (!piece) return false;

		return (this.chess.turn() === 'w' && piece.color === 'w') ||
			(this.chess.turn() === 'b' && piece.color === 'b');
	}
	canSelectSquare(row: number, col: number): boolean {
		// Cannot select squares if game has ended or in replay mode
		if (this.gameEnded || this.isReplayMode) {
			return false;
		}

		const square = this.getSquareNotation(row, col);
		const piece = this.chess.get(square as any);

		// Can only select pieces of the current player
		return !!(piece && this.isCurrentPlayerPiece(row, col));
	}
	isDangerTime(player: LiveGamePlayer): boolean {
		return GameTimerUtils.isDangerTime(player.timeRemaining) && this.currentPlayer === player && !this.gameEnded;
	}
	onSquareClick(row: number, col: number) {
		// Prevent any board interaction if game has ended or in replay mode
		if (this.gameEnded || this.isReplayMode) {
			return;
		}

		const square = this.getSquareNotation(row, col);

		if (this.selectedSquare && this.possibleMoves.includes(square)) {
			// Make move
			this.makeMove(this.selectedSquare, square);
		} else if (this.canSelectSquare(row, col)) {
			// Select square
			this.selectSquare(row, col);
		} else if (this.selectedSquare) {
			// Deselect if clicking on empty square or opponent's piece
			this.selectedSquare = null;
			this.possibleMoves = [];
			this.notificationService.showGameMessage('MOVE_CANCELLED');
		}
	} selectSquare(row: number, col: number) {
		// Prevent selection if game has ended or in replay mode
		if (this.gameEnded || this.isReplayMode) {
			return;
		}

		const square = this.getSquareNotation(row, col);
		const piece = this.chess.get(square as any);

		if (piece && this.isCurrentPlayerPiece(row, col)) {
			this.selectedSquare = square;
			this.possibleMoves = this.chess.moves({
				square: square as any,
				verbose: false
			}).map(move => {
				// Extract destination square from move notation
				return ChessBoardUtils.extractDestinationSquare(move);
			}).filter(Boolean);

			// Provide feedback about available moves
			this.notificationService.showAvailableMovesToast(this.possibleMoves.length);
		}
	} makeMove(from: string, to: string) {
		// Prevent moves if game has ended or in replay mode
		if (this.gameEnded || this.isReplayMode) {
			return;
		}

		try {
			const move = this.chess.move({
				from: from as any,
				to: to as any,
				promotion: 'q' // Always promote to queen for simplicity
			});

			if (move) {
				// Clear undone history when a new move is made
				// This prevents redo after a new move is played
				this.undoneHistory = [];
				this.hasUndoneMove = false;

				this.updateBoard();
				this.updateGameHistory();
				this.selectedSquare = null;
				this.possibleMoves = [];

				// Force change detection to update button states immediately
				this.changeDetectorRef.detectChanges();

				// Switch current player
				this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;				// Provide move feedback
				this.notificationService.showMoveToast(move.san);

				// Check game status
				this.checkGameStatus();
			}
		} catch (error) {
			console.error('Invalid move:', error);
			this.notificationService.showGameMessage('INVALID_MOVE');
		}
	} checkGameStatus() {
		if (this.gameEnded) return; // Prevent multiple dialogs

		if (this.chess.isCheckmate()) {
			this.gameStatus = 'checkmate';
			this.gameEnded = true;
			this.gameTimerService.stopTimer();
			// Clear game state and force UI update
			this.selectedSquare = null;
			this.possibleMoves = [];
			this.changeDetectorRef.detectChanges();
			this.notificationService.showGameEndAlert(
				'Checkmate!',
				`${this.chess.turn() === 'w' ? 'Black' : 'White'} wins!`,
				() => this.router.navigate(['/game']),
				() => this.router.navigate(['/game'])
			);
		} else if (this.chess.isStalemate()) {
			this.gameStatus = 'stalemate';
			this.gameEnded = true;
			this.gameTimerService.stopTimer();
			// Clear game state and force UI update
			this.selectedSquare = null;
			this.possibleMoves = [];
			this.changeDetectorRef.detectChanges();
			this.notificationService.showGameEndAlert(
				'Stalemate!',
				'The game is a draw.',
				() => this.router.navigate(['/game']),
				() => this.router.navigate(['/game'])
			);
		} else if (this.chess.isDraw()) {
			this.gameStatus = 'draw';
			this.gameEnded = true;
			this.gameTimerService.stopTimer();
			// Clear game state and force UI update
			this.selectedSquare = null;
			this.possibleMoves = [];
			this.changeDetectorRef.detectChanges();
			this.notificationService.showGameEndAlert(
				'Draw!',
				'The game ended in a draw.',
				() => this.router.navigate(['/game']),
				() => this.router.navigate(['/game'])
			);
		} else if (this.chess.isCheck()) {
			this.gameStatus = 'check';
		} else {
			this.gameStatus = 'active';
		}
	}
	resetGame() {
		this.chess.reset();
		this.initializeBoard();
		this.gameStatus = 'active';
		this.gameEnded = false; // Reset the flag
		this.selectedSquare = null;
		this.possibleMoves = [];
		this.currentPlayer = this.player1;

		// Reset undo/redo state
		this.hasUndoneMove = false;
		this.undoneHistory = [];

		// Reset timers to original values
		this.player1.timeRemaining = 900; // 15 minutes
		this.player2.timeRemaining = 900; // 15 minutes

		// Force change detection to update button states immediately
		this.changeDetectorRef.detectChanges();

		// Restart the timer
		this.startTimer();
	}

	startTimer() {
		this.gameTimerService.initializeTimer(
			this.player1.timeRemaining,
			this.player2.timeRemaining,
			'player1'
		);
		this.gameTimerService.startTimer();

		// Subscribe to timer state to update player times
		const timerSubscription = this.gameTimerService.timerState$.subscribe(state => {
			this.player1.timeRemaining = state.player1Time;
			this.player2.timeRemaining = state.player2Time;

			if (state.timeExpired && state.expiredPlayer) {
				this.gameEnded = true;
				this.gameStatus = 'timeout';
				const winner = state.expiredPlayer === 'player1' ? this.player2 : this.player1;
				this.notificationService.showGameEndAlert(
					'Time\'s Up!',
					`${state.expiredPlayer === 'player1' ? this.player1.username : this.player2.username} ran out of time!`,
					() => this.router.navigate(['/game']),
					() => this.router.navigate(['/game'])
				);
			}
		});

		this.subscriptions.push(timerSubscription);
	}

	formatTime(seconds: number): string {
		return GameTimerUtils.formatTime(seconds);
	}

	getMoveNumber(index: number): number {
		return GameTimerUtils.getMoveNumber(index);
	}
	async onChatClick() {
		this.notificationService.showGameMessage('CHAT_COMING_SOON');
	}

	async onAbortClick() {
		this.notificationService.showAbortGameAlert(() => {
			this.abortGame();
		});
	}

	abortGame() {
		// Set the aborting player's time to 0 and end the game
		this.currentPlayer.timeRemaining = 0;
		this.gameEnded = true;
		this.gameStatus = 'aborted';

		// Clear the timer
		this.gameTimerService.stopTimer();

		// Clear any selected squares and possible moves
		this.selectedSquare = null;
		this.possibleMoves = [];

		// Reset undo/redo state
		this.hasUndoneMove = false;
		this.undoneHistory = [];

		// Force change detection to update button states immediately
		this.changeDetectorRef.detectChanges();

		// Determine winner (the player who didn't abort)
		const winner = this.currentPlayer === this.player1 ? this.player2 : this.player1;
		const loser = this.currentPlayer;

		// Show game end message
		this.notificationService.showGameEndAlert(
			'Game Aborted',
			`${winner.username} wins by abandonment. ${loser.username} forfeited the game.`,
			() => this.router.navigate(['/game']),
			() => this.router.navigate(['/game'])
		);
	} async onHintClick() {
		if (this.gameEnded) {
			this.notificationService.showGameMessage('HINTS_NOT_AVAILABLE');
			return;
		}

		const possibleMoves = this.chess.moves();
		if (possibleMoves.length > 0) {
			const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
			this.notificationService.showHintToast(randomMove);
		} else {
			this.notificationService.showToast('No moves available!', 'warning');
		}
	} async onUndoClick() {
		if (this.gameHistory.length === 0) {
			this.notificationService.showGameMessage('NO_MOVES_TO_UNDO');
			return;
		}

		// Get the last move and check permissions
		const lastMove = this.gameHistory[this.gameHistory.length - 1];
		if (!lastMove) return;

		// Don't allow undo if the next player has already undone a move
		if (lastMove.playerId !== this.currentPlayer.id && this.hasUndoneMove) {
			this.notificationService.showToast('Cannot undo: Next player has already made changes!', 'warning');
			return;
		}

		// Store the undone move for potential redo
		this.undoneHistory.push(lastMove);
		this.hasUndoneMove = true;

		// Remove the move from game history
		this.gameHistory.pop();

		// If undoing opponent's move, switch back to them
		if (lastMove.playerId !== this.currentPlayer.id) {
			this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
		}

		// Undo the move in chess.js
		this.chess.undo();
		this.updateBoard();
		this.selectedSquare = null;
		this.possibleMoves = [];

		// Reset game status if needed
		if (this.gameEnded) {
			this.gameEnded = false;
			this.gameStatus = 'active';
			// Restart timer if game was ended
			this.startTimer();
		}

		// Force change detection to update button states immediately
		this.changeDetectorRef.detectChanges();

		this.notificationService.showGameMessage('UNDO_SUCCESS');
	} async onRedoClick() {
		if (!this.hasUndoneMove || this.undoneHistory.length === 0) {
			this.notificationService.showGameMessage('NO_MOVES_TO_REDO');
			return;
		}

		// Get the last undone move
		const moveToRedo = this.undoneHistory.pop();
		if (moveToRedo) {
			try {
				// Re-apply the move using chess.js
				const move = this.chess.move({
					from: moveToRedo.from,
					to: moveToRedo.to,
					promotion: moveToRedo.promotion
				});

				if (move) {
					// Add the move back to history
					this.gameHistory.push(moveToRedo);

					// After redo, switch to the next player so they can play
					this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;

					// Only reset hasUndoneMove if we've redone all undone moves
					if (this.undoneHistory.length === 0) {
						this.hasUndoneMove = false;
					}

					this.updateBoard();
					this.selectedSquare = null;
					this.possibleMoves = [];

					// Force change detection to update button states immediately
					this.changeDetectorRef.detectChanges();

					this.notificationService.showGameMessage('REDO_SUCCESS');
				}
			} catch (error) {
				// If redo fails, put the move back in undone history
				this.undoneHistory.push(moveToRedo);
				this.notificationService.showToast('Unable to redo move!', 'error');
			}
		}
	}

	// Computed property for undo availability
	get canUndo(): boolean {
		if (this.gameHistory.length === 0 || this.gameEnded) {
			return false;
		}

		const lastMove = this.gameHistory[this.gameHistory.length - 1];
		if (!lastMove) return false;

		// Allow undo if:
		// 1. It's the current player's own last move, OR
		// 2. The last move was by the opponent but current player hasn't moved yet
		return lastMove.playerId === this.currentPlayer.id ||
			(lastMove.playerId !== this.currentPlayer.id && !this.hasUndoneMove);
	}

	// Computed property for redo availability
	get canRedo(): boolean {
		return this.hasUndoneMove && this.undoneHistory.length > 0 && !this.gameEnded;
	}	// Replay functionality methods
	enterReplayMode() {
		if (!this.gameEnded) {
			this.notificationService.showGameMessage('REPLAY_ONLY_AFTER_GAME');
			return;
		}

		if (this.gameHistory.length === 0) {
			this.notificationService.showGameMessage('NO_MOVES_TO_REPLAY');
			return;
		}

		this.chessReplayService.enterReplayMode(this.gameHistory, this.chess.fen());

		// Clear any selected squares or highlights during replay
		this.selectedSquare = null;
		this.possibleMoves = [];

		// Force change detection to update UI immediately
		this.changeDetectorRef.detectChanges();

		this.notificationService.showGameMessage('ENTERED_REPLAY_MODE');
	}

	exitReplayMode() {
		if (!this.isReplayMode) return;

		this.chessReplayService.exitReplayMode();

		// Restore original game state
		const replayState = this.chessReplayService.getCurrentState();
		if (replayState.originalGameState) {
			this.chess.load(replayState.originalGameState);
			this.updateBoard();
		}

		// Clear any replay-related UI state
		this.selectedSquare = null;
		this.possibleMoves = [];

		// Force change detection to update UI immediately
		this.changeDetectorRef.detectChanges();

		this.notificationService.showGameMessage('EXITED_REPLAY_MODE');
	} replayToPosition(position: number) {
		if (!this.isReplayMode || position < 0 || position > this.replayMoves.length) {
			return;
		}

		// Reset to starting position
		this.chess.reset();

		// Play moves up to the target position
		for (let i = 0; i < position; i++) {
			const move = this.replayMoves[i];
			try {
				this.chess.move({
					from: move.from,
					to: move.to,
					promotion: move.promotion || 'q'
				});
			} catch (error) {
				console.error('Error replaying move:', error, move);
				// Try to continue with the next move
				continue;
			}
		}

		this.updateBoard();

		// Force change detection to update UI immediately
		this.changeDetectorRef.detectChanges();

		// Show current position info using notification service
		this.notificationService.showReplayPositionToast(position, this.replayMoves);
	}

	replayNextMove() {
		if (!this.isReplayMode) return;
		this.chessReplayService.nextMove();
	}

	replayPreviousMove() {
		if (!this.isReplayMode) return;
		this.chessReplayService.previousMove();
	}

	replayToStart() {
		if (!this.isReplayMode) return;
		this.chessReplayService.goToStart();
	}

	replayToEnd() {
		if (!this.isReplayMode) return;
		this.chessReplayService.goToEnd();
	}

	// Computed properties for replay controls
	get canReplayPrevious(): boolean {
		return this.isReplayMode && this.replayPosition > 0;
	}

	get canReplayNext(): boolean {
		return this.isReplayMode && this.replayPosition < this.replayMoves.length;
	}
	// This method is no longer needed as we use the notification service directly
	// All toast calls have been replaced with this.notificationService.showToast() or specific message methods
}
