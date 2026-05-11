import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoundService {
  private API = `${environment.apiUrl}/rounds`;
  constructor(private http: HttpClient) {}

  getByCommittee(committeeId: string): Observable<any> {
    return this.http.get<any>(`${this.API}/${committeeId}`);
  }

  complete(id: string): Observable<any> {
    return this.http.put<any>(`${this.API}/round/${id}/complete`, {});
  }

  submitRecipientTx(roundId: string, transactionId: string): Observable<any> {
    return this.http.patch<any>(`${this.API}/round/${roundId}/recipient-tx`, { transactionId });
  }
}
