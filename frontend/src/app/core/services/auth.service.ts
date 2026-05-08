import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cnic?: string;
  role: 'SUPER_ADMIN' | 'ORGANIZER' | 'MEMBER';
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: { user: User; token: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): User | null {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get token(): string | null { return localStorage.getItem('token'); }
  get isLoggedIn(): boolean { return !!this.token; }
  get isAdmin(): boolean { return this.currentUser?.role === 'SUPER_ADMIN'; }
  get isOrganizer(): boolean { return ['SUPER_ADMIN', 'ORGANIZER'].includes(this.currentUser?.role || ''); }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, { email, password }).pipe(
      tap(res => {
        if (res.success) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          this.currentUserSubject.next(res.data.user);
        }
      })
    );
  }

  register(data: Partial<User> & { password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, data).pipe(
      tap(res => {
        if (res.success) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          this.currentUserSubject.next(res.data.user);
        }
      })
    );
  }

  getMe(): Observable<any> {
    return this.http.get<any>(`${this.API}/me`).pipe(
      tap(res => {
        if (res.success) {
          localStorage.setItem('user', JSON.stringify(res.data));
          this.currentUserSubject.next(res.data);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }
}
