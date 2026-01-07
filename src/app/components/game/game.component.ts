import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface GameInfo {
  id: number;
  player1: string;
  player2: string;
  status: string;
  currentPlayer: string;
}

interface Move {
  moveId?: number;
  gameId: number;
  username: string;
  fromSquare: string;
  toSquare: string;
  moveNumber: number;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  gameId: number | null = null;
  gameInfo: GameInfo | null = null;
  currentUsername: string | null = '';
  moves: Move[] = [];
  selectedSquare: string | null = null;
  isMyTurn: boolean = false;
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showQuitConfirm: boolean = false;
  opponentQuit: boolean = false;
  opponentQuitMessage: string = '';
  validMoves: string[] = [];
  private movePollingInterval: any;
  private gamePollingInterval: any;

  // Initial board setup (simple representation)
  private board: (string | null)[][] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initializeBoard();
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUsername = this.authService.getUsername();
    this.gameId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.gameId) {
      this.loadGame();
      this.loadMoves();
      
      // Poll for new moves every 2 seconds
      this.movePollingInterval = setInterval(() => {
        this.loadMoves();
      }, 2000);

      // Poll for game status every 3 seconds
      this.gamePollingInterval = setInterval(() => {
        this.loadGame();
        this.checkForOpponentQuit();
      }, 3000);
    }
  }

  ngOnDestroy() {
    if (this.movePollingInterval) {
      clearInterval(this.movePollingInterval);
    }
    if (this.gamePollingInterval) {
      clearInterval(this.gamePollingInterval);
    }
  }

  initializeBoard() {
    // Initialize empty board
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Set up initial pieces (simplified - just show pieces on first and last rows)
    const pieces = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];
    const pawns = '♟';
    const whitePieces = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'];
    const whitePawns = '♙';

    // Black pieces (top row)
    for (let i = 0; i < 8; i++) {
      this.board[0][i] = pieces[i];
      this.board[1][i] = pawns;
    }

    // White pieces (bottom row)
    for (let i = 0; i < 8; i++) {
      this.board[7][i] = whitePieces[i];
      this.board[6][i] = whitePawns;
    }
  }

  getSquareName(row: number, col: number): string {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[col] + ranks[row];
  }

  getPieceAtSquare(row: number, col: number): string | null {
    return this.board[row][col];
  }

  loadGame() {
    if (!this.gameId) return;
    
    this.http.get<GameInfo>(`http://localhost:8080/api/games/${this.gameId}`)
      .subscribe({
        next: (game) => {
          this.gameInfo = game;
          this.isMyTurn = game.currentPlayer === this.currentUsername;
          
          // Check if game is abandoned
          if (game.status === 'ABANDONED') {
            this.opponentQuitMessage = 'The game has been abandoned.';
            this.opponentQuit = true;
          }
        },
        error: (error) => {
          console.error('Error loading game:', error);
        }
      });
  }

  checkForOpponentQuit() {
    if (!this.gameInfo) return;
    // Status check is done in loadGame
  }

  loadMoves() {
    if (!this.gameId) return;
    
    this.http.get<Move[]>(`http://localhost:8080/api/moves/game/${this.gameId}`)
      .subscribe({
        next: (moves) => {
          this.moves = moves;
          this.updateBoardFromMoves(moves);
        },
        error: (error) => {
          console.error('Error loading moves:', error);
        }
      });
  }

  updateBoardFromMoves(moves: Move[]) {
    // Reset board
    this.initializeBoard();
    
    // Apply moves in order
    moves.forEach(move => {
      const fromPos = this.squareToPosition(move.fromSquare);
      const toPos = this.squareToPosition(move.toSquare);
      
      if (fromPos && toPos) {
        // Get piece from source square BEFORE moving
        const piece = this.board[fromPos.row][fromPos.col];
        if (piece) {
          // Clear source square
          this.board[fromPos.row][fromPos.col] = null;
          // Place piece on destination (capture if needed)
          this.board[toPos.row][toPos.col] = piece;
        }
      }
    });
  }

  squareToPosition(square: string): { row: number; col: number } | null {
    if (square.length !== 2) return null;
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const col = files.indexOf(square[0]);
    const row = ranks.indexOf(square[1]);
    return (col >= 0 && row >= 0) ? { row, col } : null;
  }

  onSquareClick(square: string) {
    if (!this.isMyTurn || !this.gameId || !this.currentUsername) {
      if (!this.isMyTurn) {
        this.showToastMessage('Wait for your turn!', 'info');
      }
      return;
    }

    if (!this.selectedSquare) {
      // Select square - check if it has a piece
      const pos = this.squareToPosition(square);
      if (pos && this.board[pos.row][pos.col]) {
        // Check if it's the player's piece
        const piece = this.board[pos.row][pos.col];
        if (piece) {
          const isWhitePiece = this.isWhitePiece(piece);
          const isMyPiece = (this.gameInfo?.currentPlayer === this.gameInfo?.player1 && isWhitePiece) ||
                            (this.gameInfo?.currentPlayer === this.gameInfo?.player2 && !isWhitePiece);
          
          if (isMyPiece) {
            this.selectedSquare = square;
            this.loadValidMoves(square);
          } else {
            this.showToastMessage('You can only move your own pieces!', 'error');
          }
        }
      }
    } else {
      // Make move
      if (this.selectedSquare === square) {
        // Deselect
        this.selectedSquare = null;
        this.validMoves = [];
      } else {
        // Check if move is valid
        if (this.validMoves.includes(square)) {
          this.makeMove(this.selectedSquare, square);
          this.selectedSquare = null;
          this.validMoves = [];
        } else {
          this.showToastMessage('Invalid move! Select a highlighted square.', 'error');
          // Try to select new piece
          const pos = this.squareToPosition(square);
          if (pos && this.board[pos.row][pos.col]) {
            const piece = this.board[pos.row][pos.col];
            if (piece) {
              const isWhitePiece = this.isWhitePiece(piece);
              const isMyPiece = (this.gameInfo?.currentPlayer === this.gameInfo?.player1 && isWhitePiece) ||
                                (this.gameInfo?.currentPlayer === this.gameInfo?.player2 && !isWhitePiece);
              if (isMyPiece) {
                this.selectedSquare = square;
                this.loadValidMoves(square);
              } else {
                this.selectedSquare = null;
                this.validMoves = [];
              }
            } else {
              this.selectedSquare = null;
              this.validMoves = [];
            }
          } else {
            this.selectedSquare = null;
            this.validMoves = [];
          }
        }
      }
    }
  }

  isWhitePiece(piece: string): boolean {
    return piece === "♙" || piece === "♖" || piece === "♘" || 
           piece === "♗" || piece === "♕" || piece === "♔";
  }

  loadValidMoves(square: string) {
    if (!this.gameId || !this.currentUsername) return;

    this.validMoves = []; // Clear first
    
    this.http.get<any>(`http://localhost:8080/api/moves/valid/${this.gameId}?fromSquare=${square}&username=${this.currentUsername}`)
      .subscribe({
        next: (response) => {
          if (response.validMoves && Array.isArray(response.validMoves)) {
            this.validMoves = response.validMoves;
            console.log('Valid moves for', square, ':', this.validMoves);
          } else {
            this.validMoves = [];
          }
        },
        error: (error) => {
          console.error('Error loading valid moves:', error);
          this.validMoves = [];
          if (error.error?.error) {
            this.showToastMessage(error.error.error, 'error');
          }
        }
      });
  }

  makeMove(fromSquare: string, toSquare: string) {
    if (!this.gameId || !this.currentUsername) return;

    this.http.post('http://localhost:8080/api/moves', {
      gameId: this.gameId,
      username: this.currentUsername,
      fromSquare: fromSquare,
      toSquare: toSquare
    }).subscribe({
      next: (response: any) => {
        if (response.valid) {
          this.showToastMessage('Move made successfully!', 'success');
          this.loadMoves();
          this.loadGame();
        } else {
          this.showToastMessage(response.message || 'Invalid move', 'error');
        }
      },
      error: (error) => {
        this.showToastMessage(error.error?.message || 'Error making move', 'error');
      }
    });
  }

  showToastMessage(message: string, type: 'success' | 'error' | 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  isSquareSelected(square: string): boolean {
    return this.selectedSquare === square;
  }

  getLastMoveToSquare(): string | null {
    if (this.moves.length === 0) return null;
    return this.moves[this.moves.length - 1].toSquare;
  }

  quitGame() {
    if (!this.gameId || !this.currentUsername) return;

    this.http.post(`http://localhost:8080/api/games/${this.gameId}/quit?username=${this.currentUsername}`, {})
      .subscribe({
        next: () => {
          this.showQuitConfirm = false;
          this.showToastMessage('You left the game', 'info');
          // Clear any pending invitations
          this.http.delete(`http://localhost:8080/api/invitations/pending/${this.currentUsername}`).subscribe();
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1500);
        },
        error: (error) => {
          this.showToastMessage('Error leaving game', 'error');
        }
      });
  }

  handleOpponentQuit() {
    this.opponentQuit = false;
    this.router.navigate(['/home']);
  }

  isSquareValidMove(square: string): boolean {
    return this.validMoves.includes(square);
  }

  hasPieceAtSquare(square: string): boolean {
    const pos = this.squareToPosition(square);
    if (!pos) return false;
    return this.board[pos.row][pos.col] != null;
  }

  goBack() {
    // Clear any pending invitations before going back
    if (this.currentUsername) {
      this.http.delete(`http://localhost:8080/api/invitations/pending/${this.currentUsername}`).subscribe();
    }
    this.router.navigate(['/home']);
  }
}
