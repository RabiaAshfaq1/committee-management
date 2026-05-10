import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private API = `${environment.apiUrl}/dashboard`;
  constructor(private http: HttpClient) {}

  getStats(): Observable<any> { return this.http.get<any>(`${this.API}/stats`); }
  getRecentActivity(): Observable<any> { return this.http.get<any>(`${this.API}/recent-activity`); }
}
