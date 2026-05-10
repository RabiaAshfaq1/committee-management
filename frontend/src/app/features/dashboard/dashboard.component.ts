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
    <div class="max-w-3xl mx-auto space-y-8 animate-fade-in px-2">
      <div class="text-center space-y-2 pt-2">
        <h1 class="text-2xl font-bold text-slate-800">Hello, {{ auth.currentUser?.name }}</h1>
        <p class="text-slate-500 text-sm">
          @if (auth.isOrganizer) {
            Create a committee, invite members to the roster, then run monthly rounds from Rounds.
          } @else {
            Below is a quick summary of committees you belong to.
          }
        </p>
      </div>

      @if (auth.isOrganizer) {
        <div class="flex justify-center">
          <a routerLink="/committees" class="btn-primary text-sm px-8 py-3 rounded-2xl shadow-lg">+ New committee</a>
        </div>
      }

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        @if (loading()) {
          @for (i of [1,2,3]; track i) {
            <div class="glass-card h-24 skeleton"></div>
          }
        } @else if (stats()) {
          <div class="glass-card p-5 text-center">
            <p class="text-xs text-slate-500 uppercase tracking-wide">Committees</p>
            <p class="text-2xl font-bold font-mono text-indigo-600 mt-1">{{ stats().totalCommittees }}</p>
          </div>
          <div class="glass-card p-5 text-center">
            <p class="text-xs text-slate-500 uppercase tracking-wide">People in your circles</p>
            <p class="text-2xl font-bold font-mono text-purple-600 mt-1">{{ stats().peopleInNetwork }}</p>
            <p class="text-[10px] text-slate-400 mt-1">distinct members</p>
          </div>
          <div class="glass-card p-5 text-center">
            <p class="text-xs text-slate-500 uppercase tracking-wide">Rounds</p>
            <p class="text-lg font-bold text-slate-800 mt-1">
              <span class="text-emerald-600">{{ stats().activeRounds }}</span>
              <span class="text-slate-300 mx-1">/</span>
              <span class="text-slate-600">{{ stats().completedRounds }}</span>
            </p>
            <p class="text-[10px] text-slate-400 mt-1">active / completed</p>
          </div>
        }
      </div>

      <div class="glass-card p-6">
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
                  <p class="text-xs text-slate-400 mt-0.5">{{ act.time | date:'short' }}</p>
                </div>
              </li>
            }
          </ul>
        }
      </div>

      <div class="flex flex-wrap justify-center gap-3 pb-8">
        <a routerLink="/committees" class="btn-secondary text-sm py-2 px-4 rounded-xl">Committees</a>
        <a routerLink="/rounds" class="btn-secondary text-sm py-2 px-4 rounded-xl">Rounds</a>
        @if (auth.isOrganizer) {
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

  constructor(private dashSvc: DashboardService, public auth: AuthService) {}

  ngOnInit() {
    this.dashSvc.getStats().subscribe({
      next: (r) => {
        this.stats.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.dashSvc.getRecentActivity().subscribe({ next: (r) => this.activities.set(r.data || []) });
  }
}
