import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6" style="background-color: #f8fafc">
      <div
        class="w-full max-w-md rounded-2xl shadow-xl border border-white/70 p-8 md:p-10 backdrop-blur-md"
        style="background: rgba(255,255,255,0.92)"
      >
        <div class="text-center mb-8">
          <p class="font-playfair text-3xl md:text-4xl font-bold" style="color: #6366f1">Amanat</p>
          <p class="text-slate-500 text-sm mt-2 leading-snug">Har Committee Ka Bharosa</p>
          <p class="text-slate-400 text-xs mt-4">Sign in to continue</p>
        </div>
        @if (error()) {
          <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
            <p class="text-red-700 text-sm">{{ error() }}</p>
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="login-email" class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              id="login-email"
              type="email"
              formControlName="email"
              placeholder="you@example.com"
              autocomplete="email"
              class="block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-shadow placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500"
              [ngClass]="{
                'border-slate-300': !(form.controls.email.invalid && form.controls.email.touched),
                'border-red-400 ring-1 ring-red-200': form.controls.email.invalid && form.controls.email.touched,
              }"
            />
            @if (form.controls.email.invalid && form.controls.email.touched) {
              <p class="text-red-600 text-xs mt-1.5">{{ fieldError('email') }}</p>
            }
          </div>
          <div>
            <label for="login-password" class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              id="login-password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              class="block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500"
              [ngClass]="{
                'border-slate-300': !(form.controls.password.invalid && form.controls.password.touched),
                'border-red-400 ring-1 ring-red-200': form.controls.password.invalid && form.controls.password.touched,
              }"
            />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <p class="text-red-600 text-xs mt-1.5">{{ fieldError('password') }}</p>
            }
          </div>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="loading() || form.invalid"
            class="!w-full !rounded-xl !py-2.5 !font-semibold !text-white"
            style="background: var(--gradient-cta, linear-gradient(135deg,#5b5ef0,#8b7fd9))"
          >
            @if (loading()) {
              <span class="inline-flex items-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            } @else {
              Log in
            }
          </button>
        </form>
        <p class="text-center text-sm text-slate-500 mt-6">
          Don't have an account?
          <a routerLink="/auth/register" class="text-indigo-600 font-semibold hover:underline">Register</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  loading = signal(false);
  error = signal('');

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const email = this.form.value.email!.trim().toLowerCase();
    const password = this.form.value.password!.trim();
    this.auth
      .login(email, password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            void this.router.navigate(['/dashboard']);
            return;
          }
          this.error.set(res.message || 'Sign in failed');
        },
        error: (err) => this.error.set(this.describeLoginError(err)),
      });
  }

  fieldError(key: 'email' | 'password'): string {
    const c = this.form.get(key);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'This field is required';
    if (key === 'email' && c.errors['email']) return 'Enter a valid email address';
    return 'Invalid value';
  }

  private describeLoginError(err: { status?: number; error?: { message?: string } }): string {
    const s = err?.status;
    if (s === 0) {
      return `Cannot reach the API (often CORS or wrong URL). This app calls: ${environment.apiUrl}. In Vercel → frontend project → set NG_APP_API_URL=https://YOUR-BACKEND.vercel.app/api, save, then Redeploy.`;
    }
    if (s === 404) {
      return 'API not found (404). Fix backend deploy or set NG_APP_API_URL to https://YOUR-BACKEND.vercel.app/api';
    }
    if (s === 401) {
      const m401 = err?.error?.message;
      if (typeof m401 === 'string' && m401.trim()) return m401;
      return 'Invalid credentials';
    }
    if (s === 403) {
      const m = err?.error?.message;
      return typeof m === 'string' && m.trim()
        ? m
        : '403 Forbidden. On Vercel: Settings → Deployment Protection → turn off for Production (or allow your frontend URL).';
    }
    const m = err?.error?.message;
    if (typeof m === 'string' && m.trim()) return m;
    return 'Invalid credentials';
  }
}
