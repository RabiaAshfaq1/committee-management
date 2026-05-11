import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly base = `${environment.apiUrl}/feedback`;

  constructor(private http: HttpClient) {}

  create(body: { toUserId: string; committeeId: string; rating: number; comment?: string | null }): Observable<unknown> {
    return this.http.post(this.base, body);
  }

  forUser(userId: string): Observable<unknown> {
    return this.http.get(`${this.base}/user/${userId}`);
  }
}
