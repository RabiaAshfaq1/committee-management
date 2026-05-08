import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoundService {
  private API = `${environment.apiUrl}/rounds`;
  constructor(private http: HttpClient) {}

  start(data: any): Observable<any> { return this.http.post<any>(`${this.API}/start`, data); }
  getByCommittee(committeeId: string): Observable<any> { return this.http.get<any>(`${this.API}/${committeeId}`); }
  complete(id: string): Observable<any> { return this.http.put<any>(`${this.API}/${id}/complete`, {}); }
}
