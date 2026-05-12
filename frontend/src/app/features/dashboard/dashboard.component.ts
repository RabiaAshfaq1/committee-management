import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in px-1 sm:px-2">
      <div class="text-center space-y-2 pt-1 sm:pt-2">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 text-balance px-1">Hello, {{ auth.currentUser?.name }}</h1>
        <p class="text-slate-500 text-xs sm:text-sm max-w-prose mx-auto px-2 leading-relaxed">
          @if (auth.isAdmin) {
            Platform overview — moderate committees, confirm payments, and keep trust data accurate.
          } @else {
            Snapshot of committees you organize or have joined.
          }
        </p>
      </div>

      <div class="flex flex-col sm:flex-row flex-wrap justify-stretch sm:justify-center gap-2 sm:gap-3 px-1">
        <a routerLink="/committees" class="btn-primary text-sm px-5 py-3 sm:py-2.5 rounded-2xl shadow-lg text-center w-full sm:w-auto sm:min-w-0">+ Create committee</a>
        <a routerLink="/committees" class="btn-secondary text-sm px-5 py-3 sm:py-2.5 rounded-2xl text-center w-full sm:w-auto">Browse committees</a>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        @if (loading()) {
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="glass-card h-28 skeleton rounded-2xl"></div>
          }
        } @else if (stats()) {
          <div class="stat-card rounded-2xl flex-col items-stretch text-center">
            <div
              class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg"
              style="background: var(--gradient-cta)"
            >
              🏦
            </div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">
              {{ auth.isAdmin ? 'All committees' : 'My committees' }}
            </p>
            <p class="text-2xl font-bold font-mono mt-1" style="color: var(--primary)">{{ display().c }}</p>
          </div>
          <div class="stat-card rounded-2xl flex-col items-stretch text-center">
            <div
              class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg"
              style="background: linear-gradient(135deg, var(--brand-emerald, #10b981), #059669)"
            >
              🔄
            </div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">Active rounds</p>
            <p class="text-2xl font-bold font-mono mt-1 text-emerald-600">{{ display().a }}</p>
          </div>
          <div class="stat-card rounded-2xl flex-col items-stretch text-center">
            <div
              class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg"
              style="background: linear-gradient(135deg, var(--brand-gold, #f59e0b), #ea580c)"
            >
              ⏳
            </div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">
              {{ auth.isAdmin ? 'Pending confirmation' : 'My pending payments' }}
            </p>
            <p class="text-2xl font-bold font-mono mt-1 text-amber-600">{{ display().p }}</p>
          </div>
          <div class="stat-card rounded-2xl flex-col items-stretch text-center relative overflow-hidden">
            <div
              class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg z-10"
              style="background: linear-gradient(135deg, #6366f1, #8b5cf6)"
            >
              ✓
            </div>
            <p class="text-xs text-slate-500 uppercase tracking-wide z-10">Trust score</p>
            <div class="relative w-24 h-24 mx-auto mt-1">
              <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="#e2e8f0" stroke-width="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="var(--brand-emerald, #10b981)"
                  stroke-width="10"
                  fill="none"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="264"
                  [attr.stroke-dashoffset]="264 - (264 * (display().t || 0)) / 100"
                  class="transition-all duration-1000 ease-out"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span class="text-xl font-bold text-slate-800">{{ display().t }}</span>
              </div>
            </div>
          </div>
        }
      </div>

      <div class="glass-card p-4 sm:p-6 rounded-2xl">
        <h3 class="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 text-center">Recent activity</h3>
        @if (!activities().length) {
          <p class="text-slate-400 text-sm text-center py-6">Nothing to show yet</p>
        } @else {
          <ul class="space-y-3 max-h-72 overflow-y-auto">
            @for (act of activities(); track $index) {
              <li class="flex gap-3 text-sm text-slate-700 border-b border-slate-100 pb-3 last:border-0 min-w-0">
                <span class="text-lg flex-shrink-0 leading-none" aria-hidden="true">{{ activityIcon(act.type) }}</span>
                <div class="min-w-0">
                  <p class="break-words">{{ act.message }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ act.time | date: 'short' }}</p>
                </div>
              </li>
            }
          </ul>
        }
      </div>

      <div class="flex flex-col sm:flex-row flex-wrap justify-stretch sm:justify-center gap-2 sm:gap-3 pb-6 sm:pb-8 px-1">
        <a routerLink="/committees" class="btn-secondary text-sm py-3 sm:py-2 px-4 rounded-xl text-center w-full sm:w-auto">Committees</a>
        <a routerLink="/rounds" class="btn-secondary text-sm py-3 sm:py-2 px-4 rounded-xl text-center w-full sm:w-auto">Rounds</a>
        @if (auth.isAdmin) {
          <a routerLink="/members" class="btn-secondary text-sm py-3 sm:py-2 px-4 rounded-xl text-center w-full sm:w-auto">Members</a>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<any>(null);
  activities = signal<any[]>([]);
  display = signal({ c: 0, a: 0, p: 0, t: 0 });

  private animTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private dashSvc: DashboardService, public auth: AuthService) {}

  activityIcon(type: string): string {
    if (type === 'committee') return '🏦';
    if (type === 'round') return '🔄';
    if (type === 'payment') return '💸';
    if (type === 'join') return '➕';
    return '✨';
  }

  ngOnInit(): void {
    this.dashSvc.getStats().subscribe({
      next: (r) => {
        this.stats.set(r.data);
        this.loading.set(false);
        this.runCounters(r.data);
      },
      error: () => this.loading.set(false),
    });
    this.dashSvc.getRecentActivity().subscribe({ next: (r) => this.activities.set(r.data || []) });
  }

  private runCounters(raw: any): void {
    if (this.animTimer) clearInterval(this.animTimer);
    const targets = {
      c: Number(raw?.myCommitteesCount ?? raw?.totalCommittees ?? 0),
      a: Number(raw?.activeRoundsCount ?? raw?.activeRounds ?? 0),
      p: Number(raw?.pendingPaymentsCount ?? 0),
      t: Number(raw?.trustScore ?? 0),
    };
    const duration = 650;
    const stepMs = 40;
    const steps = Math.max(1, Math.floor(duration / stepMs));
    let step = 0;
    this.animTimer = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      const ease = 1 - Math.pow(1 - t, 2);
      this.display.set({
        c: Math.round(targets.c * ease),
        a: Math.round(targets.a * ease),
        p: Math.round(targets.p * ease),
        t: Math.round(targets.t * ease),
      });
      if (t >= 1 && this.animTimer) {
        clearInterval(this.animTimer);
        this.animTimer = null;
      }
    }, stepMs);
  }
}
