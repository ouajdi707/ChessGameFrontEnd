import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { InvitationService } from '../../services/invitation.service';
import { OnlineUser, Invitation } from '../../models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  currentUsername: string | null = '';
  onlineUsers: OnlineUser[] = [];
  pendingInvitation: Invitation | null = null;
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private webSocketService: WebSocketService,
    private router: Router,
    private invitationService: InvitationService
  ) {}

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUsername = this.authService.getUsername();
    if (this.currentUsername) {
      this.webSocketService.connect(this.currentUsername);
      // Clear any pending invitations when coming to home
      this.webSocketService.clearPendingInvitation();
      this.pendingInvitation = null;
    }

    // Subscribe to online users
    const usersSub = this.webSocketService.getOnlineUsers().subscribe(users => {
      this.onlineUsers = users;
    });
    this.subscriptions.push(usersSub);

    // Subscribe to invitations
    const invSub = this.webSocketService.getInvitations().subscribe(invitation => {
      if (invitation) {
        this.handleInvitation(invitation);
      }
    });
    this.subscriptions.push(invSub);

    // Check for active game (in case invitation was accepted)
    this.checkForActiveGame();
    
    // Poll for active game every 3 seconds
    setInterval(() => {
      this.checkForActiveGame();
    }, 3000);

    // Poll for pending invitations and clear if there's an active game
    setInterval(() => {
      this.checkAndClearOldInvitations();
    }, 2000);
  }

  checkAndClearOldInvitations() {
    if (!this.currentUsername) return;
    
    // Always check if we have an active game - if yes, clear invitation
    this.webSocketService.checkActiveGame(this.currentUsername).subscribe({
      next: (response: any) => {
        if (response && response.gameId) {
          // We have an active game, clear the invitation
          if (this.pendingInvitation) {
            this.pendingInvitation = null;
            this.webSocketService.clearPendingInvitation();
          }
        }
      },
      error: () => {
        // No active game, check if invitation still exists on server
        if (this.pendingInvitation) {
          // Verify invitation still exists
          this.invitationService.getPendingInvitation(this.currentUsername!)
            .subscribe({
              error: (error) => {
                if (error.status === 404) {
                  // Invitation no longer exists, clear it
                  this.pendingInvitation = null;
                }
              }
            });
        }
      }
    });
  }

  checkForActiveGame() {
    if (!this.currentUsername) return;
    
    this.webSocketService.checkActiveGame(this.currentUsername).subscribe({
      next: (response: any) => {
        if (response && response.gameId) {
          // Clear any pending invitations if we have an active game
          this.pendingInvitation = null;
          this.webSocketService.clearPendingInvitation();
          // Redirect to game if we have an active game
          this.router.navigate(['/game', response.gameId]);
        }
      },
      error: () => {
        // No active game, that's fine
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.currentUsername) {
      this.webSocketService.disconnect();
    }
  }

  handleInvitation(invitation: Invitation) {
    if (invitation.type === 'INVITATION') {
      // Only show if we don't have an active game
      this.webSocketService.checkActiveGame(this.currentUsername || '').subscribe({
        next: (response: any) => {
          if (!response || !response.gameId) {
            this.pendingInvitation = invitation;
          }
        },
        error: () => {
          // No active game, show invitation
          this.pendingInvitation = invitation;
        }
      });
    } else if (invitation.type === 'INVITATION_ACCEPTED') {
      // Immediately clear invitation for both players
      this.pendingInvitation = null;
      this.webSocketService.clearPendingInvitation();
      this.showToastMessage('Game started! Redirecting...', 'success');
      if (invitation.gameId) {
        setTimeout(() => {
          this.router.navigate(['/game', invitation.gameId]);
        }, 1500);
      }
    } else if (invitation.type === 'INVITATION_DECLINED') {
      this.pendingInvitation = null;
      this.webSocketService.clearPendingInvitation();
      this.showToastMessage(invitation.message, 'info');
    }
  }

  inviteUser(username: string) {
    if (this.currentUsername) {
      this.webSocketService.sendInvitation(this.currentUsername, username);
      this.showToastMessage(`Invitation sent to ${username}`, 'info');
    }
  }

  acceptInvitation() {
    if (this.pendingInvitation && this.currentUsername) {
      // Store invitation data before clearing
      const invitationFrom = this.pendingInvitation.fromUsername;
      
      // Immediately clear the invitation UI for both players
      this.pendingInvitation = null;
      this.webSocketService.clearPendingInvitation();
      
      this.webSocketService.acceptInvitation(
        invitationFrom,
        this.currentUsername
      ).subscribe({
        next: (response: any) => {
          // Ensure invitation is cleared
          this.pendingInvitation = null;
          this.webSocketService.clearPendingInvitation();
          this.showToastMessage('Game started! Redirecting...', 'success');
          if (response.gameId) {
            setTimeout(() => {
              this.router.navigate(['/game', response.gameId]);
            }, 1500);
          }
        },
        error: (error) => {
          this.showToastMessage('Error accepting invitation', 'error');
        }
      });
    }
  }

  declineInvitation() {
    if (this.pendingInvitation && this.currentUsername) {
      this.webSocketService.declineInvitation(
        this.pendingInvitation.fromUsername,
        this.currentUsername
      );
      this.pendingInvitation = null;
    }
  }

  showToastMessage(message: string, type: 'success' | 'error' | 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

