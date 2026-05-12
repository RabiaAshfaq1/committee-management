import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule],
  template: `
    <div class="min-h-[100dvh] min-h-screen flex items-center justify-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6" style="background-color: #f8fafc">
      <div
        class="w-full max-w-lg rounded-2xl shadow-xl border border-white/70 p-6 sm:p-8 md:p-10 backdrop-blur-md max-h-[92dvh] overflow-y-auto"
        style="background: rgba(255,255,255,0.92)"
      >
        <div class="text-center mb-6">
          <p class="font-playfair text-3xl font-bold" style="color: #6366f1">Amanat</p>
          <p class="text-slate-500 text-sm mt-2 leading-snug">Har Committee Ka Bharosa</p>
          <p class="text-slate-800 font-semibold mt-4">Create account</p>
        </div>
        @if (error()) {
          <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
            <p class="text-red-700 text-sm">{{ error() }}</p>
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-3">
          <div>
            <label for="reg-name" class="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
            <input
              id="reg-name"
              type="text"
              formControlName="name"
              autocomplete="name"
              class="block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500"
              [ngClass]="{
                'border-slate-300': !(form.controls.name.invalid && form.controls.name.touched),
                'border-red-400 ring-1 ring-red-200': form.controls.name.invalid && form.controls.name.touched,
              }"
            />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <p class="text-red-600 text-xs mt-1.5">{{ fieldError('name') }}</p>
            }
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="reg-email" class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                id="reg-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                class="block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500"
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
              <label for="reg-phone" class="block text-sm font-medium text-slate-700 mb-1.5">Phone (optional)</label>
              <input
                id="reg-phone"
                type="text"
                formControlName="phone"
                autocomplete="tel"
                class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label for="reg-cnic" class="block text-sm font-medium text-slate-700 mb-1.5">CNIC (optional)</label>
            <input
              id="reg-cnic"
              type="text"
              formControlName="cnic"
              class="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500"
            />
          </div>
          <div>
            <label for="reg-password" class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              id="reg-password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
              class="block w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/35 focus:border-indigo-500"
              [ngClass]="{
                'border-slate-300': !(form.controls.password.invalid && form.controls.password.touched),
                'border-red-400 ring-1 ring-red-200': form.controls.password.invalid && form.controls.password.touched,
              }"
            />
            @if (form.controls.password.invalid && form.controls.password.touched) {
              <p class="text-red-600 text-xs mt-1.5">{{ fieldError('password') }}</p>
            }
          </div>
          <div>
            <p class="text-xs text-slate-500 mb-2">Role</p>
            <div class="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                class="flex-1 py-2.5 text-sm font-semibold transition-colors"
                [class.text-white]="form.value.role === 'MEMBER'"
                [style.background]="form.value.role === 'MEMBER' ? 'var(--gradient-cta, linear-gradient(135deg,#5b5ef0,#8b7fd9))' : 'transparent'"
                [class.text-slate-600]="form.value.role !== 'MEMBER'"
                (click)="form.patchValue({ role: 'MEMBER' })"
              >
                Member
              </button>
              <button
                type="button"
                class="flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-slate-200"
                [class.text-white]="form.value.role === 'ADMIN'"
                [style.background]="form.value.role === 'ADMIN' ? 'var(--gradient-cta, linear-gradient(135deg,#5b5ef0,#8b7fd9))' : 'transparent'"
                [class.text-slate-600]="form.value.role !== 'ADMIN'"
                (click)="form.patchValue({ role: 'ADMIN' })"
              >
                Admin
              </button>
            </div>
          </div>
          <button
            mat-flat-button
            type="submit"
            [disabled]="loading() || form.invalid"
            class="!w-full !rounded-xl !py-2.5 !mt-2 !font-semibold !text-white"
            style="background: var(--gradient-cta, linear-gradient(135deg,#5b5ef0,#8b7fd9))"
          >
            @if (loading()) {
              Creating…
            } @else {
              Register
            }
          </button>
        </form>
        <p class="text-center text-sm text-slate-500 mt-4">
          Already have an account? <a routerLink="/auth/login" class="text-indigo-600 font-semibold hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent implements OnInit {
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    cnic: [''],
    role: ['MEMBER' as 'MEMBER' | 'ADMIN'],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  loading = signal(false);
  error = signal('');

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'ADMIN' || role === 'MEMBER') {
      this.form.patchValue({ role });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const name = (v.name ?? '').trim();
    const email = (v.email ?? '').trim();
    const password = v.password ?? '';
    const role = v.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
    const payload: Parameters<AuthService['register']>[0] = {
      name,
      email,
      phone: v.phone?.trim() ? v.phone.trim() : undefined,
      cnic: v.cnic?.trim() ? v.cnic.trim() : undefined,
      password,
      role,
    };
    this.auth
      .register(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            void this.router.navigate(['/dashboard']);
            return;
          }
          this.error.set(res.message || 'Registration failed');
        },
        error: (err) => this.error.set(this.describeRegisterError(err)),
      });
  }

  fieldError(key: 'name' | 'email' | 'password'): string {
    const c = this.form.get(key);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'This field is required';
    if (key === 'email' && c.errors['email']) return 'Enter a valid email address';
    if (key === 'password' && c.errors['minlength']) return 'Use at least 6 characters';
    return 'Invalid value';
  }

  private describeRegisterError(err: { status?: number; error?: { message?: string; error?: string } }): string {
    const s = err?.status;
    if (s === 0) {
      return `Cannot reach the API. Calling: ${environment.apiUrl}. Set NG_APP_API_URL on Vercel (frontend) to your backend + /api, then Redeploy.`;
    }
    if (s === 404) {
      return 'API not found (404). Fix backend deploy or NG_APP_API_URL (.../api).';
    }
    if (s === 403) {
      const m = err?.error?.message;
      return typeof m === 'string' && m.trim()
        ? m
        : '403 Forbidden. Check Vercel Deployment Protection on the backend project.';
    }
    const body = err?.error as { message?: string; error?: string } | undefined;
    const m = typeof body?.message === 'string' ? body.message.trim() : '';
    const e = typeof body?.error === 'string' ? body.error.trim() : '';
    if (e && (!m || m === 'Registration failed')) {
      if (e.includes('trustScore') || e.includes('P2022')) {
        return 'Your database is missing a column (trustScore on User). In Supabase → SQL Editor, run the script in backend/prisma/sql/add-user-trust-score.sql, then try again.';
      }
      if (e.includes('not found in enum') && e.includes('Role')) {
        return 'Your database has an old Role enum (e.g. ORGANIZER). From the backend folder run: pwsh -File scripts/fix-legacy-role-enum.ps1, or run the three SQL files in prisma/sql/ (see backend error details), then try again.';
      }
      return e.length > 320 ? `${e.slice(0, 320)}…` : e;
    }
    if (m) return m;
    return 'Registration failed';
  }
}
