import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex" style="background: linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4C1D95 100%);">
      <!-- Left hero panel -->
      <div class="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 text-white">
        <div class="max-w-md text-center animate-slide-up">
          <div class="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center animate-pulse-glow"
               style="background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2)">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h1 class="text-4xl font-bold mb-4">CommitteeMS</h1>
          <p class="text-indigo-200 text-lg leading-relaxed">Committees, rounds, and payout proof — simple and clear.</p>
          <div class="mt-10 grid grid-cols-3 gap-4">
            @for (s of stats; track s.label) {
              <div class="p-4 rounded-xl" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1)">
                <p class="text-2xl font-bold">{{ s.value }}</p>
                <p class="text-indigo-300 text-xs mt-1">{{ s.label }}</p>
              </div>
            }
          </div>
        </div>
      </div>
      <!-- Login form -->
      <div class="flex-1 flex items-center justify-center p-6">
        <div class="w-full max-w-md animate-slide-up">
          <div class="glass-card p-8" style="background:rgba(255,255,255,0.96)">
            <div class="text-center mb-8">
              <h2 class="text-2xl font-bold text-slate-800">Welcome back</h2>
              <p class="text-slate-500 mt-1 text-sm">Sign in to your account</p>
            </div>
            @if (error()) {
              <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
                <p class="text-red-700 text-sm">{{ error() }}</p>
              </div>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input formControlName="email" type="email" placeholder="you@example.com"
                       class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
                              border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input formControlName="password" [type]="showPass() ? 'text' : 'password'" placeholder="••••••••"
                       class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
                              border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
              </div>
              <button type="submit" [disabled]="loading() || form.invalid"
                      class="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
                @if (loading()) { <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Signing in... }
                @else { Sign In }
              </button>
            </form>
            <p class="text-center text-sm text-slate-500 mt-6">
              Don't have an account? <a routerLink="/auth/register" class="text-indigo-600 font-semibold hover:underline">Register</a>
            </p>
          </div>
        </div>
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
  showPass = signal(false);
  stats = [{ value: '500+', label: 'Committees' }, { value: '10K+', label: 'Members' }, { value: '₨2M+', label: 'Managed' }];

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true); this.error.set('');
    this.auth.login(this.form.value.email!, this.form.value.password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => { this.error.set(err?.error?.message || 'Invalid credentials'); this.loading.set(false); },
    });
  }
}
