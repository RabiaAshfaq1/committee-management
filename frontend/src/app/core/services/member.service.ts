import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private API = `${environment.apiUrl}/members`;
  constructor(private http: HttpClient) {}

  getAll(params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => { if (params[k] !== undefined && params[k] !== '') p = p.set(k, params[k]); });
    return this.http.get<any>(this.API, { params: p });
  }

  getById(id: string): Observable<any> { return this.http.get<any>(`${this.API}/${id}`); }
  getHistory(id: string): Observable<any> { return this.http.get<any>(`${this.API}/${id}/history`); }
  create(data: any): Observable<any> { return this.http.post<any>(this.API, data); }
  update(id: string, data: any): Observable<any> { return this.http.put<any>(`${this.API}/${id}`, data); }
  deactivate(id: string): Observable<any> { return this.http.patch<any>(`${this.API}/${id}/deactivate`, {}); }
}
