import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CommitteeService {
  private API = `${environment.apiUrl}/committees`;
  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any>(this.API, { params: p });
  }

  getById(id: string): Observable<any> { return this.http.get<any>(`${this.API}/${id}`); }
  create(data: any): Observable<any> { return this.http.post<any>(this.API, data); }
  update(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.API}/${id}`, data); }
  delete(id: string): Observable<any> { return this.http.delete<any>(`${this.API}/${id}`); }
  addMember(id: string, data: any): Observable<any> { return this.http.post<any>(`${this.API}/${id}/members`, data); }
  removeMember(id: string, memberId: string): Observable<any> { return this.http.delete<any>(`${this.API}/${id}/members/${memberId}`); }
  assignTurns(id: string, data?: any): Observable<any> { return this.http.post<any>(`${this.API}/${id}/assign-turns`, data || {}); }
}
