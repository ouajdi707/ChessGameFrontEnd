import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Move, ValidMovesResponse, MakeMoveRequest, MakeMoveResponse } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MoveService {
  constructor(private http: HttpClient) {}

  getMoves(gameId: number): Observable<Move[]> {
    return this.http.get<Move[]>(`${environment.apiUrl}/moves/game/${gameId}`);
  }

  getValidMoves(gameId: number, fromSquare: string, username: string): Observable<ValidMovesResponse> {
    return this.http.get<ValidMovesResponse>(`${environment.apiUrl}/moves/valid/${gameId}?fromSquare=${fromSquare}&username=${username}`);
  }

  makeMove(request: MakeMoveRequest): Observable<MakeMoveResponse> {
    return this.http.post<MakeMoveResponse>(`${environment.apiUrl}/moves`, request);
  }
}

