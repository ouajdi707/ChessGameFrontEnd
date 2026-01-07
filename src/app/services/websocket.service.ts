import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface OnlineUser {
  username: string;
  isOnline: boolean;
}

export interface Invitation {
  type: string;
  fromUsername: string;
  toUsername: string;
  gameId?: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private connected: boolean = false;
  private onlineUsers$ = new BehaviorSubject<OnlineUser[]>([]);
  private invitations$ = new BehaviorSubject<Invitation | null>(null);
  private currentUsername: string = '';
  private invitationPollingInterval: any;
  private usersPollingInterval: any;

  constructor(private http: HttpClient) {}

  connect(username: string): void {
    if (this.connected) {
      return;
    }

    this.currentUsername = username;
    
    // Mark user as online
    this.http.post(`http://localhost:8080/api/users/online/${username}`, {}).subscribe({
      next: () => {
        this.connected = true;
        this.loadOnlineUsers(username);
        
        // Set up polling for online users (every 3 seconds)
        this.usersPollingInterval = setInterval(() => {
          if (this.connected) {
            this.loadOnlineUsers(username);
          }
        }, 3000);

        // Set up polling for invitations (every 2 seconds)
        this.invitationPollingInterval = setInterval(() => {
          if (this.connected) {
            this.checkInvitations(username);
          }
        }, 2000);
      },
      error: (error) => {
        console.error('Error connecting:', error);
        this.connected = false;
      }
    });
  }

  disconnect(): void {
    if (this.currentUsername && this.connected) {
      this.http.delete(`http://localhost:8080/api/users/online/${this.currentUsername}`).subscribe();
    }
    if (this.usersPollingInterval) {
      clearInterval(this.usersPollingInterval);
    }
    if (this.invitationPollingInterval) {
      clearInterval(this.invitationPollingInterval);
    }
    this.connected = false;
    this.currentUsername = '';
  }

  sendInvitation(fromUsername: string, toUsername: string): void {
    this.http.post('http://localhost:8080/api/invitations/send', {
      fromUsername,
      toUsername
    }).subscribe({
      next: () => console.log('Invitation sent'),
      error: (error) => console.error('Error sending invitation:', error)
    });
  }

  acceptInvitation(fromUsername: string, toUsername: string) {
    return this.http.post('http://localhost:8080/api/invitations/accept', {
      fromUsername,
      toUsername
    });
  }

  declineInvitation(fromUsername: string, toUsername: string): void {
    this.http.post('http://localhost:8080/api/invitations/decline', {
      fromUsername,
      toUsername
    }).subscribe({
      next: () => console.log('Invitation declined'),
      error: (error) => console.error('Error declining invitation:', error)
    });
  }

  getOnlineUsers(): Observable<OnlineUser[]> {
    return this.onlineUsers$.asObservable();
  }

  getInvitations(): Observable<Invitation | null> {
    return this.invitations$.asObservable();
  }

  private loadOnlineUsers(currentUser: string): void {
    this.http.get<OnlineUser[]>(`http://localhost:8080/api/users/online?currentUser=${currentUser}`)
      .subscribe({
        next: (users) => {
          this.onlineUsers$.next(users);
        },
        error: (error) => {
          console.error('Error loading online users:', error);
        }
      });
  }

  private checkInvitations(username: string): void {
    // Poll for pending invitations
    this.http.get<any>(`http://localhost:8080/api/invitations/pending/${username}`)
      .subscribe({
        next: (invitation) => {
          if (invitation && invitation.type === 'INVITATION') {
            // Only show if it's a new invitation (not already shown)
            const currentInvitation = this.invitations$.getValue();
            if (!currentInvitation || currentInvitation.fromUsername !== invitation.fromUsername) {
              this.invitations$.next(invitation);
            }
          }
        },
        error: (error) => {
          // If 404, clear any pending invitation
          if (error.status === 404) {
            const currentInvitation = this.invitations$.getValue();
            if (currentInvitation && currentInvitation.type === 'INVITATION') {
              this.invitations$.next(null);
            }
          } else if (error.status !== 404) {
            console.error('Error checking invitations:', error);
          }
        }
      });
  }

  checkActiveGame(username: string) {
    return this.http.get<any>(`http://localhost:8080/api/games/active/${username}`);
  }

  clearPendingInvitation() {
    // Clear pending invitation by making a request to remove it
    if (this.currentUsername) {
      this.http.delete(`http://localhost:8080/api/invitations/pending/${this.currentUsername}`).subscribe();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
