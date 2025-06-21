import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
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
	timerInterval: any;

	// Drag and drop properties
	draggedPiece: { row: number; col: number; piece: string } | null = null;
	isDragging = false;
	// Replay functionality properties
	isReplayMode = false;
	replayPosition = 0;
	replayMoves: any[] = [];
	originalGameState: any = null; constructor(
		private route: ActivatedRoute,
		private router: Router,
		private alertController: AlertController,
		private toastController: ToastController,
		private changeDetectorRef: ChangeDetectorRef
	) {
		this.currentPlayer = this.player1;        // Add icons for ion-icon to work
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
	}

	ngOnDestroy() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}
	}

	initializeBoard() {
		this.updateBoard();
		this.updateGameHistory();
	}

	updateBoard() {
		const fen = this.chess.board();
		this.board = fen.map(row =>
			row.map(square => {
				if (!square) return null;

				// Map chess.js pieces to symbols
				const pieceMap: { [key: string]: string } = {
					'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', // black pieces
					'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'  // white pieces
				};

				const pieceKey = square.color === 'w' ? square.type.toUpperCase() : square.type.toLowerCase();
				return pieceMap[pieceKey] || square.type;
			})
		);
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
		const files = 'abcdefgh';
		const ranks = '87654321'; // reversed because board is displayed from white's perspective
		return files[col] + ranks[row];
	}

	isSquareLight(row: number, col: number): boolean {
		return (row + col) % 2 === 0;
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
		return player.timeRemaining <= 60 && this.currentPlayer === player && !this.gameEnded;
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
			this.showToast('Move cancelled');
		}
	}
	selectSquare(row: number, col: number) {
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
				const match = move.match(/[a-h][1-8]/g);
				return match ? match[match.length - 1] : '';
			}).filter(Boolean);

			// Provide feedback about available moves
			if (this.possibleMoves.length === 0) {
				this.showToast('No valid moves available for this piece');
			} else {
				this.showToast(`${this.possibleMoves.length} moves available`);
			}
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
				this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;

				// Provide move feedback
				this.showToast(`Move: ${move.san}`);

				// Check game status
				this.checkGameStatus();
			}
		} catch (error) {
			console.error('Invalid move:', error);
			this.showToast('Invalid move!');
		}
	}
	checkGameStatus() {
		if (this.gameEnded) return; // Prevent multiple dialogs

		if (this.chess.isCheckmate()) {
			this.gameStatus = 'checkmate';
			this.gameEnded = true;
			clearInterval(this.timerInterval);
			// Clear game state and force UI update
			this.selectedSquare = null;
			this.possibleMoves = [];
			this.changeDetectorRef.detectChanges();
			this.showGameEndDialog('Checkmate!', `${this.chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
		} else if (this.chess.isStalemate()) {
			this.gameStatus = 'stalemate';
			this.gameEnded = true;
			clearInterval(this.timerInterval);
			// Clear game state and force UI update
			this.selectedSquare = null;
			this.possibleMoves = [];
			this.changeDetectorRef.detectChanges();
			this.showGameEndDialog('Stalemate!', 'The game is a draw.');
		} else if (this.chess.isDraw()) {
			this.gameStatus = 'draw';
			this.gameEnded = true;
			clearInterval(this.timerInterval);
			// Clear game state and force UI update
			this.selectedSquare = null;
			this.possibleMoves = [];
			this.changeDetectorRef.detectChanges();
			this.showGameEndDialog('Draw!', 'The game ended in a draw.');
		} else if (this.chess.isCheck()) {
			this.gameStatus = 'check';
		} else {
			this.gameStatus = 'active';
		}
	}

	async showGameEndDialog(header: string, message: string) {
		const alert = await this.alertController.create({
			header,
			message,
			buttons: [
				{
					text: 'View Game History',
					handler: () => {
						this.router.navigate(['/game']);

					}
				},
				{
					text: 'Back to Lobby',
					handler: () => {
						this.router.navigate(['/game']);
					}
				}
			]
		});
		await alert.present();
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
		this.timerInterval = setInterval(() => {
			if (this.gameEnded) {
				// Stop timer if game has ended
				clearInterval(this.timerInterval);
				return;
			}

			if (this.currentPlayer.timeRemaining > 0) {
				this.currentPlayer.timeRemaining--;
			} else {
				// Time's up! Stop the timer and show dialog
				clearInterval(this.timerInterval);
				this.gameEnded = true;
				this.gameStatus = 'timeout';
				this.showGameEndDialog('Time\'s Up!', `${this.currentPlayer.username} ran out of time!`);
			}
		}, 1000);
	}

	formatTime(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	getMoveNumber(index: number): number {
		return Math.floor(index / 2) + 1;
	}

	async onChatClick() {
		const toast = await this.toastController.create({
			message: 'Chat functionality coming soon!',
			duration: 2000,
			position: 'top',
			color: 'primary'
		});
		await toast.present();
	} async onAbortClick() {
		const alert = await this.alertController.create({
			header: 'Abort Game',
			message: 'Are you sure you want to abort this game? This action cannot be undone.',
			buttons: [
				{
					text: 'Cancel',
					role: 'cancel'
				},
				{
					text: 'Abort Game',
					handler: () => {
						this.abortGame();
					}
				}
			]
		});
		await alert.present();
	}
	abortGame() {
		// Set the aborting player's time to 0 and end the game
		this.currentPlayer.timeRemaining = 0;
		this.gameEnded = true;
		this.gameStatus = 'aborted';

		// Clear the timer
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}

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
		this.showGameEndDialog(`Game Aborted`, `${winner.username} wins by abandonment. ${loser.username} forfeited the game.`);
	}

	async onHintClick() {
		const possibleMoves = this.chess.moves();
		if (possibleMoves.length > 0) {
			const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
			const toast = await this.toastController.create({
				message: `Consider: ${randomMove}`,
				duration: 3000,
				position: 'top',
				color: 'success'
			});
			await toast.present();
		}
	} async onUndoClick() {
		if (this.gameHistory.length === 0) {
			const toast = await this.toastController.create({
				message: 'No moves to undo!',
				duration: 2000,
				position: 'top',
				color: 'warning'
			});
			await toast.present();
			return;
		}

		// Get the last move and check permissions
		const lastMove = this.gameHistory[this.gameHistory.length - 1];
		if (!lastMove) return;

		// Don't allow undo if the next player has already undone a move
		if (lastMove.playerId !== this.currentPlayer.id && this.hasUndoneMove) {
			const toast = await this.toastController.create({
				message: 'Cannot undo: Next player has already made changes!',
				duration: 2000,
				position: 'top',
				color: 'warning'
			});
			await toast.present();
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

		const toast = await this.toastController.create({
			message: 'Move undone successfully!',
			duration: 1500,
			position: 'top',
			color: 'success'
		});
		await toast.present();
	}
	async onRedoClick() {
		if (!this.hasUndoneMove || this.undoneHistory.length === 0) {
			const toast = await this.toastController.create({
				message: 'No moves to redo!',
				duration: 2000,
				position: 'top',
				color: 'warning'
			});
			await toast.present();
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

					const toast = await this.toastController.create({
						message: 'Move redone successfully!',
						duration: 1500,
						position: 'top',
						color: 'success'
					});
					await toast.present();
				}
			} catch (error) {
				// If redo fails, put the move back in undone history
				this.undoneHistory.push(moveToRedo);
				const toast = await this.toastController.create({
					message: 'Unable to redo move!',
					duration: 2000,
					position: 'top',
					color: 'danger'
				});
				await toast.present();
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
			this.showToast('Replay is only available after the game ends!');
			return;
		}

		if (this.gameHistory.length === 0) {
			this.showToast('No moves to replay!');
			return;
		}

		this.isReplayMode = true;
		this.replayPosition = 0;
		this.replayMoves = [...this.gameHistory]; // Create a snapshot of the game history
		this.originalGameState = this.chess.fen(); // Save current state

		// Reset to starting position
		this.chess.reset();
		this.updateBoard();

		// Clear any selected squares or highlights during replay
		this.selectedSquare = null;
		this.possibleMoves = [];

		// Force change detection to update UI immediately
		this.changeDetectorRef.detectChanges();

		this.showToast('Entered replay mode - Use controls to navigate');
	}
	exitReplayMode() {
		if (!this.isReplayMode) return;

		this.isReplayMode = false;
		this.replayPosition = 0;
		this.replayMoves = [];

		// Restore original game state
		if (this.originalGameState) {
			this.chess.load(this.originalGameState);
			this.updateBoard();
		}

		// Clear any replay-related UI state
		this.selectedSquare = null;
		this.possibleMoves = [];

		// Force change detection to update UI immediately
		this.changeDetectorRef.detectChanges();

		this.showToast('Exited replay mode');
	}
	replayToPosition(position: number) {
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

		this.replayPosition = position;
		this.updateBoard();

		// Force change detection to update UI immediately
		this.changeDetectorRef.detectChanges();

		// Show current position info
		if (position === 0) {
			this.showToast('Start position');
		} else if (position === this.replayMoves.length) {
			this.showToast('Final position');
		} else {
			const currentMove = this.replayMoves[position - 1];
			this.showToast(`Move ${position}: ${currentMove.notation}`);
		}
	}

	replayNextMove() {
		if (!this.isReplayMode) return;
		if (this.replayPosition < this.replayMoves.length) {
			this.replayToPosition(this.replayPosition + 1);
		}
	}

	replayPreviousMove() {
		if (!this.isReplayMode) return;
		if (this.replayPosition > 0) {
			this.replayToPosition(this.replayPosition - 1);
		}
	}

	replayToStart() {
		if (!this.isReplayMode) return;
		this.replayToPosition(0);
	}

	replayToEnd() {
		if (!this.isReplayMode) return;
		this.replayToPosition(this.replayMoves.length);
	}

	// Computed properties for replay controls
	get canReplayPrevious(): boolean {
		return this.isReplayMode && this.replayPosition > 0;
	}

	get canReplayNext(): boolean {
		return this.isReplayMode && this.replayPosition < this.replayMoves.length;
	}

	async showToast(message: string) {
		const toast = await this.toastController.create({
			message: message,
			duration: 2000,
			position: 'top',
			color: 'primary'
		});
		toast.present();
	}
}
