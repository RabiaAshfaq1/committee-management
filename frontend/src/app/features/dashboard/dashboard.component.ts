import { Component, OnInit, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p class="text-slate-500 text-sm mt-0.5">Welcome back, {{ auth.currentUser?.name }} 👋</p>
        </div>
        <a routerLink="/committees" class="btn-primary text-sm">+ New Committee</a>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="glass-card p-6 h-28 skeleton"></div>
          }
        } @else {
          @for (card of statCards(); track card.label) {
            <div class="stat-card">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" [style.background]="card.bg">{{ card.icon }}</div>
              <div>
                <p class="text-slate-500 text-xs font-medium uppercase tracking-wide">{{ card.label }}</p>
                <p class="text-2xl font-bold text-slate-800 font-mono mt-0.5">{{ card.value }}</p>
                @if (card.sub) { <p class="text-xs mt-0.5" [class]="card.subClass">{{ card.sub }}</p> }
              </div>
            </div>
          }
        }
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div class="glass-card p-6 xl:col-span-2">
          <h3 class="text-base font-semibold text-slate-700 mb-4">Monthly Collection Trend</h3>
          <div class="relative h-56"><canvas #barChart></canvas></div>
        </div>
        <div class="glass-card p-6">
          <h3 class="text-base font-semibold text-slate-700 mb-4">Payment Status</h3>
          <div class="relative h-44"><canvas #pieChart></canvas></div>
          <div class="mt-3 space-y-1.5">
            @for (l of pieLabels; track l.label) {
              <div class="flex items-center gap-2 text-xs text-slate-600">
                <div class="w-3 h-3 rounded-full" [style.background]="l.color"></div>{{ l.label }}
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Activity -->
      <div class="glass-card p-6">
        <h3 class="text-base font-semibold text-slate-700 mb-4">Recent Activity</h3>
        @if (!activities().length) {
          <p class="text-slate-400 text-sm text-center py-6">No recent activity</p>
        } @else {
          <div class="space-y-2">
            @for (act of activities(); track $index) {
              <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                     [ngClass]="act.type==='payment'?'bg-green-100':act.type==='committee'?'bg-indigo-100':'bg-purple-100'">
                  {{ act.type==='payment'?'💳':act.type==='committee'?'🏦':'🔄' }}
                </div>
                <div>
                  <p class="text-sm text-slate-700">{{ act.message }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ act.time | date:'short' }}</p>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('barChart') barRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChart') pieRef!: ElementRef<HTMLCanvasElement>;
  loading = signal(true);
  stats = signal<any>(null);
  activities = signal<any[]>([]);
  statCards = signal<any[]>([]);
  pieLabels = [{ label: 'Paid', color: '#10B981' }, { label: 'Pending', color: '#F59E0B' }, { label: 'Late', color: '#EF4444' }];

  constructor(private dashSvc: DashboardService, public auth: AuthService) {}

  ngOnInit() {
    this.dashSvc.getStats().subscribe({
      next: r => { this.stats.set(r.data); this.buildCards(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.dashSvc.getRecentActivity().subscribe({ next: r => this.activities.set(r.data || []) });
  }

  ngAfterViewInit() { setTimeout(() => this.renderCharts(), 600); }

  buildCards(d: any) {
    this.statCards.set([
      { label: 'Total Committees', icon: '🏦', value: d.totalCommittees, bg: 'rgba(99,102,241,0.1)', sub: 'Active committees', subClass: 'text-indigo-500' },
      { label: 'Total Members', icon: '👥', value: d.totalMembers, bg: 'rgba(139,92,246,0.1)', sub: 'Registered', subClass: 'text-purple-500' },
      { label: 'Collected (Month)', icon: '💰', value: `₨${(d.totalCollectedMonth||0).toLocaleString()}`, bg: 'rgba(16,185,129,0.1)', sub: 'This month', subClass: 'text-emerald-500' },
      { label: 'Pending + Late', icon: '⏳', value: (d.pendingPayments||0)+(d.latePayments||0), bg: 'rgba(245,158,11,0.1)', sub: `${d.latePayments} overdue`, subClass: 'text-red-500' },
    ]);
  }

  renderCharts() {
    const trend = this.stats()?.monthlyTrend || [];
    if (this.barRef?.nativeElement) {
      new Chart(this.barRef.nativeElement, {
        type: 'bar',
        data: { labels: trend.map((t: any) => t.month), datasets: [{ label: '₨', data: trend.map((t: any) => t.amount), backgroundColor: 'rgba(99,102,241,0.75)', borderRadius: 8, borderSkipped: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } },
      });
    }
    const s = this.stats();
    if (this.pieRef?.nativeElement && s) {
      new Chart(this.pieRef.nativeElement, {
        type: 'doughnut',
        data: { labels: ['Paid', 'Pending', 'Late'], datasets: [{ data: [s.totalCollectedMonth||0, s.pendingPayments||0, s.latePayments||0], backgroundColor: ['#10B981','#F59E0B','#EF4444'], borderWidth: 0, hoverOffset: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '68%' },
      });
    }
  }
}
