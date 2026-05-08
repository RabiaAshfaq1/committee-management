import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommitteeService } from '../../core/services/committee.service';
import { MemberService } from '../../core/services/member.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-committees',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Committees</h1>
          <p class="text-slate-500 text-sm">Manage your rotating savings committees</p>
        </div>
        @if (auth.isOrganizer) {
          <button (click)="openModal()" class="btn-primary text-sm">+ Create Committee</button>
        }
      </div>

      <!-- Search & Filter -->
      <div class="glass-card p-4 flex flex-wrap gap-3">
        <input [(ngModel)]="searchQuery" (ngModelChange)="onSearch()" placeholder="Search committees..."
               class="flex-1 min-w-48 px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 bg-slate-50"/>
        <select [(ngModel)]="statusFilter" (ngModelChange)="load()"
                class="px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <!-- Cards Grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="glass-card p-6 h-52 skeleton"></div>
          }
        </div>
      } @else if (!committees().length) {
        <div class="glass-card p-16 text-center">
          <p class="text-5xl mb-4">🏦</p>
          <h3 class="text-lg font-semibold text-slate-600">No committees yet</h3>
          <p class="text-slate-400 text-sm mt-1">Create your first committee to get started</p>
          @if (auth.isOrganizer) {
            <button (click)="openModal()" class="btn-primary mt-4 text-sm">+ Create Committee</button>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (c of committees(); track c.id) {
            <div class="glass-card p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-slate-800 truncate">{{ c.name }}</h3>
                  <p class="text-slate-500 text-xs mt-0.5 truncate">{{ c.description || 'No description' }}</p>
                </div>
                <span class="badge flex-shrink-0 ml-2"
                      [ngClass]="c.status==='ACTIVE'?'badge-success':c.status==='PAUSED'?'badge-warning':'badge-muted'">
                  {{ c.status }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 rounded-xl p-3">
                  <p class="text-xs text-slate-400">Monthly Amount</p>
                  <p class="font-bold text-slate-800 font-mono">₨{{ c.monthlyAmount?.toLocaleString() }}</p>
                </div>
                <div class="bg-slate-50 rounded-xl p-3">
                  <p class="text-xs text-slate-400">Members</p>
                  <p class="font-bold text-slate-800">{{ c._count?.members }}/{{ c.totalMembers }}</p>
                </div>
              </div>
              <!-- Progress -->
              <div>
                <div class="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Members filled</span>
                  <span>{{ getPercent(c._count?.members, c.totalMembers) }}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getPercent(c._count?.members, c.totalMembers)"></div>
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <p class="text-xs text-slate-400">By {{ c.organizer?.name }}</p>
                <a [routerLink]="['/committees', c.id]" class="btn-secondary text-xs py-1.5 px-3">View Details →</a>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-500">Showing {{ committees().length }} of {{ total() }}</p>
          <div class="flex gap-2">
            <button (click)="prevPage()" [disabled]="page()===1" class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
            <span class="px-3 py-1.5 text-sm text-slate-600">{{ page() }}</span>
            <button (click)="nextPage()" [disabled]="committees().length < pageSize" class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next →</button>
          </div>
        </div>
      }

      <!-- Create Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)">
          <div class="glass-card p-8 w-full max-w-lg animate-slide-up" style="background:white">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-slate-800">Create Committee</h2>
              <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            @if (formError()) {
              <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100"><p class="text-red-700 text-sm">{{ formError() }}</p></div>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Committee Name *</label>
                <input formControlName="name" placeholder="e.g. Family Savings Circle"
                       class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea formControlName="description" rows="2" placeholder="Optional description"
                          class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Total Members *</label>
                  <input formControlName="totalMembers" type="number" min="2" placeholder="e.g. 12"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Monthly Amount (₨) *</label>
                  <input formControlName="monthlyAmount" type="number" min="1" placeholder="e.g. 5000"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Start Date *</label>
                  <input formControlName="startDate" type="date"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1.5">Duration (months) *</label>
                  <input formControlName="durationMonths" type="number" min="1" placeholder="e.g. 12"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Turn Assignment *</label>
                <select formControlName="turnAssignment"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                  <option value="RANDOM">🎲 Random (Auto lucky draw)</option>
                  <option value="MANUAL">✏️ Manual (Admin assigns)</option>
                  <option value="BIDDING">💵 Bidding (Highest bid wins)</option>
                </select>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" (click)="showModal.set(false)" class="flex-1 btn-secondary">Cancel</button>
                <button type="submit" [disabled]="submitting() || form.invalid" class="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
                  @if (submitting()) { <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> }
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class CommitteesComponent implements OnInit {
  committees = signal<any[]>([]);
  loading = signal(true);
  showModal = signal(false);
  submitting = signal(false);
  formError = signal('');
  total = signal(0);
  page = signal(1);
  pageSize = 9;
  searchQuery = '';
  statusFilter = '';
  private searchTimer: any;

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    totalMembers: [null, [Validators.required, Validators.min(2)]],
    monthlyAmount: [null, [Validators.required, Validators.min(1)]],
    startDate: ['', Validators.required],
    durationMonths: [null, [Validators.required, Validators.min(1)]],
    turnAssignment: ['RANDOM'],
  });

  constructor(private svc: CommitteeService, public auth: AuthService, private fb: FormBuilder) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll({ page: this.page(), limit: this.pageSize, status: this.statusFilter, search: this.searchQuery }).subscribe({
      next: r => { this.committees.set(r.data || []); this.total.set(r.meta?.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }
  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage() { this.page.update(p => p + 1); this.load(); }
  openModal() { this.form.reset({ turnAssignment: 'RANDOM' }); this.formError.set(''); this.showModal.set(true); }
  getPercent(a: number, b: number) { return b ? Math.round((a / b) * 100) : 0; }

  onSubmit() {
    if (this.form.invalid) return;
    this.submitting.set(true); this.formError.set('');
    this.svc.create(this.form.value).subscribe({
      next: () => { this.showModal.set(false); this.submitting.set(false); this.load(); },
      error: err => { this.formError.set(err?.error?.message || 'Failed to create'); this.submitting.set(false); },
    });
  }
}
