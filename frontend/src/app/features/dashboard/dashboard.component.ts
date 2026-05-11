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
    <div class="max-w-5xl mx-auto space-y-8 animate-fade-in px-2">
      <div class="text-center space-y-2 pt-2">
        <h1 class="text-2xl font-bold text-slate-800">Hello, {{ auth.currentUser?.name }}</h1>
        <p class="text-slate-500 text-sm">
          @if (auth.isAdmin) {
            Manage committees, rosters, and rounds — trust profiles help everyone stay accountable.
          } @else {
            Here is a snapshot of your committees and rounds.
          }
        </p>
      </div>

      @if (auth.isAdmin) {
        <div class="flex justify-center">
          <a routerLink="/committees" class="btn-primary text-sm px-8 py-3 rounded-2xl shadow-lg">+ New committee</a>
        </div>
      }

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @if (loading()) {
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="glass-card h-28 skeleton rounded-2xl"></div>
          }
        } @else if (stats()) {
          <div class="stat-card rounded-2xl flex-col items-stretch text-center">
            <div class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg" style="background: linear-gradient(135deg,#6366F1,#8B5CF6)">🏦</div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">Total committees</p>
            <p class="text-2xl font-bold font-mono text-indigo-600 mt-1">{{ display().c }}</p>
          </div>
          <div class="stat-card rounded-2xl flex-col items-stretch text-center">
            <div class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg" style="background: linear-gradient(135deg,#10B981,#059669)">👥</div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">Total members</p>
            <p class="text-2xl font-bold font-mono text-emerald-600 mt-1">{{ display().m }}</p>
          </div>
          <div class="stat-card rounded-2xl flex-col items-stretch text-center">
            <div class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg" style="background: linear-gradient(135deg,#8B5CF6,#6366F1)">🔄</div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">Active rounds</p>
            <p class="text-2xl font-bold font-mono text-purple-600 mt-1">{{ display().a }}</p>
          </div>
          <div class="stat-card rounded-2xl flex-col items-stretch text-center">
            <div class="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-lg" style="background: linear-gradient(135deg,#F59E0B,#EA580C)">⏳</div>
            <p class="text-xs text-slate-500 uppercase tracking-wide">Pending confirmations</p>
            <p class="text-2xl font-bold font-mono text-amber-600 mt-1">{{ display().p }}</p>
            @if (!auth.isAdmin) {
              <p class="text-[10px] text-slate-400 mt-1">Admin-only metric</p>
            }
          </div>
        }
      </div>

      <div class="glass-card p-6 rounded-2xl">
        <h3 class="text-sm font-semibold text-slate-700 mb-4 text-center">Recent activity</h3>
        @if (!activities().length) {
          <p class="text-slate-400 text-sm text-center py-6">Nothing to show yet</p>
        } @else {
          <ul class="space-y-3 max-h-72 overflow-y-auto">
            @for (act of activities(); track $index) {
              <li class="flex gap-3 text-sm text-slate-700 border-b border-slate-100 pb-3 last:border-0">
                <span class="text-lg flex-shrink-0">{{ act.type === 'committee' ? '🏦' : '🔄' }}</span>
                <div>
                  <p>{{ act.message }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ act.time | date: 'short' }}</p>
                </div>
              </li>
            }
          </ul>
        }
      </div>

      <div class="flex flex-wrap justify-center gap-3 pb-8">
        <a routerLink="/committees" class="btn-secondary text-sm py-2 px-4 rounded-xl">Committees</a>
        <a routerLink="/rounds" class="btn-secondary text-sm py-2 px-4 rounded-xl">Rounds</a>
        @if (auth.isAdmin) {
          <a routerLink="/members" class="btn-secondary text-sm py-2 px-4 rounded-xl">Members</a>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  stats = signal<any>(null);
  activities = signal<any[]>([]);
  display = signal({ c: 0, m: 0, a: 0, p: 0 });

  private animTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private dashSvc: DashboardService, public auth: AuthService) {}

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
      c: Number(raw?.totalCommittees ?? 0),
      m: Number(raw?.peopleInNetwork ?? 0),
      a: Number(raw?.activeRounds ?? 0),
      p: Number(raw?.pendingConfirmations ?? 0),
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
        m: Math.round(targets.m * ease),
        a: Math.round(targets.a * ease),
        p: Math.round(targets.p * ease),
      });
      if (t >= 1 && this.animTimer) {
        clearInterval(this.animTimer);
        this.animTimer = null;
      }
    }, stepMs);
  }
}
