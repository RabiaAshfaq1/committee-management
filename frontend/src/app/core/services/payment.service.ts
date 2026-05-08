import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private API = `${environment.apiUrl}/payments`;
  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any>(this.API, { params: p });
  }

  getByRound(roundId: string): Observable<any> { return this.http.get<any>(`${this.API}/round/${roundId}`); }
  getByMember(memberId: string, params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any>(`${this.API}/member/${memberId}`, { params: p });
  }
  getOverdue(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any>(`${this.API}/overdue`, { params: p });
  }
  markPaid(id: string, note?: string): Observable<any> { return this.http.patch<any>(`${this.API}/${id}/pay`, { note }); }
}
