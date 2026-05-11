import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6"
         style="background:linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4C1D95 100%)">
      <div class="w-full max-w-lg animate-slide-up">
        <div class="glass-card p-8" style="background:rgba(255,255,255,0.96)">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-slate-800">Create Account</h2>
            <p class="text-slate-500 text-sm mt-1">Join CommitteeMS today</p>
          </div>
          @if (error()) {
            <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
              <p class="text-red-700 text-sm">{{ error() }}</p>
            </div>
          }
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <input formControlName="name" type="text" placeholder="John Doe"
                       class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
                @if (f['name'].invalid && f['name'].touched) {
                  <p class="text-red-500 text-xs mt-1">Name is required</p>
                }
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input formControlName="phone" type="tel" placeholder="+92 300 0000000"
                       class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
              <input formControlName="email" type="email" placeholder="you@example.com"
                     class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
              @if (f['email'].invalid && f['email'].touched) {
                <p class="text-red-500 text-xs mt-1">Valid email is required</p>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">CNIC (optional)</label>
              <input formControlName="cnic" type="text" placeholder="42201-1234567-1"
                     class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
              <select formControlName="role"
                      class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                <option value="MEMBER">Member</option>
                <option value="ORGANIZER">Organizer</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
              <input formControlName="password" type="password" placeholder="Min. 6 characters"
                     class="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all border-slate-200 bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
              @if (f['password'].hasError('minlength') && f['password'].touched) {
                <p class="text-red-500 text-xs mt-1">Min 6 characters</p>
              }
            </div>
            <button type="submit" [disabled]="loading() || form.invalid"
                    class="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
              @if (loading()) {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Creating account...
              } @else { Create Account }
            </button>
          </form>
          <p class="text-center text-sm text-slate-500 mt-4">
            Already have an account? <a routerLink="/auth/login" class="text-indigo-600 font-semibold hover:underline">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    cnic: [''],
    role: ['MEMBER'],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  loading = signal(false);
  error = signal('');
  get f() { return this.form.controls; }

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true); this.error.set('');
    this.auth.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(this.describeRegisterError(err));
        this.loading.set(false);
      },
    });
  }

  private describeRegisterError(err: { status?: number; error?: { message?: string } }): string {
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
    const m = err?.error?.message;
    if (typeof m === 'string' && m.trim()) return m;
    return 'Registration failed';
  }
}
