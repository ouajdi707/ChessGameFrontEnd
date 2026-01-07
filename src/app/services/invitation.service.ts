import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Invitation } from '../models';

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  constructor(private http: HttpClient) {}

  getPendingInvitation(username: string): Observable<Invitation> {
    return this.http.get<Invitation>(`${environment.apiUrl}/invitations/pending/${username}`);
  }

  clearPendingInvitation(username: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/invitations/pending/${username}`);
  }
}

