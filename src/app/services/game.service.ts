import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GameInfo } from '../models';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  constructor(private http: HttpClient) {}

  getGame(gameId: number): Observable<GameInfo> {
    return this.http.get<GameInfo>(`${environment.apiUrl}/games/${gameId}`);
  }

  quitGame(gameId: number, username: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/games/${gameId}/quit?username=${username}`, {});
  }
}

