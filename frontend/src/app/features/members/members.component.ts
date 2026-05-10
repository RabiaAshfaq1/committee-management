import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MemberService } from '../../core/services/member.service';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatSnackBarModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Members</h1>
          <p class="text-slate-500 text-sm">
            MEMBER-role accounts · joining a roster is separate: open each <a routerLink="/committees" class="text-indigo-600 font-medium hover:underline">committee</a> → “Add to committee”.
          </p>
        </div>
        <button type="button" (click)="openAdd()" class="btn-primary text-sm">+ Add member</button>
      </div>

      <div class="glass-card p-4 flex flex-wrap gap-3">
        <input [(ngModel)]="searchQuery" (ngModelChange)="onSearch()"
               placeholder="Search name, email, CNIC or phone..."
               class="flex-1 min-w-52 px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"/>
        <select [(ngModel)]="statusFilter" (ngModelChange)="page.set(1); load()"
                class="px-4 py-2 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      @if (loading()) {
        <div class="glass-card overflow-hidden"><div class="h-72 skeleton rounded-none"></div></div>
      } @else if (!members().length) {
        <div class="glass-card p-16 text-center">
          <p class="text-5xl mb-4">👥</p>
          <h3 class="text-lg font-semibold text-slate-600">No members found</h3>
          <p class="text-slate-400 text-sm mt-1">Adjust filters or add a new member</p>
          <button type="button" (click)="openAdd()" class="btn-primary mt-4 text-sm">+ Add member</button>
        </div>
      } @else {
        <div class="glass-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>CNIC</th>
                  <th>Committees</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (m of members(); track m.id) {
                  <tr>
                    <td class="font-medium text-slate-800">{{ m.name }}</td>
                    <td class="text-slate-600 text-sm">{{ m.email }}</td>
                    <td class="text-slate-500 text-sm">{{ m.phone || '—' }}</td>
                    <td class="text-slate-500 text-sm font-mono">{{ m.cnic || '—' }}</td>
                    <td class="font-mono">{{ m._count?.committees ?? 0 }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="m.isActive" [class.badge-muted]="!m.isActive">
                        {{ m.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="flex flex-wrap gap-1 justify-end">
                      <button type="button" class="btn-secondary text-xs py-1 px-2" (click)="openHistory(m)">History</button>
                      <button type="button" class="btn-secondary text-xs py-1 px-2" (click)="openEdit(m)">Edit</button>
                      @if (m.isActive) {
                        <button type="button" class="btn-secondary text-xs py-1 px-2 text-red-600 border-red-100"
                                (click)="deactivateMember(m)">Deactivate</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-500">Showing {{ members().length }} of {{ total() }}</p>
          <div class="flex gap-2">
            <button type="button" (click)="prevPage()" [disabled]="page()===1"
                    class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
            <span class="px-3 py-1.5 text-sm text-slate-600">{{ page() }}</span>
            <button type="button" (click)="nextPage()" [disabled]="members().length < pageSize()"
                    class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next →</button>
          </div>
        </div>
      }

      @if (showAddModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)"
             (keydown.escape)="closeModals()" tabindex="-1">
          <div class="glass-card p-8 w-full max-w-md animate-slide-up" style="background:white" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-slate-800">Add member</h2>
              <button type="button" (click)="closeModals()" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            @if (formError()) { <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{{ formError() }}</div> }
            <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                <input formControlName="name" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input formControlName="email" type="email" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input formControlName="phone" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">CNIC</label>
                <input formControlName="cnic" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                <input formControlName="password" type="password" autocomplete="new-password"
                       class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" (click)="closeModals()" class="flex-1 btn-secondary">Cancel</button>
                <button type="submit" class="flex-1 btn-primary disabled:opacity-50"
                        [disabled]="createForm.invalid || submitting()">{{ submitting() ? 'Saving…' : 'Create' }}</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (showHistoryModal() && historyMember()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)"
             (keydown.escape)="closeHistory()" tabindex="-1">
          <div class="glass-card p-6 w-full max-w-3xl my-8 animate-slide-up" style="background:white" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-xl font-bold text-slate-800">Member history</h2>
                <p class="text-sm text-slate-500 mt-0.5">{{ historyMember()?.name }} — committees joined and payout rounds where they were recipient</p>
              </div>
              <button type="button" (click)="closeHistory()" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            @if (historyLoading()) {
              <div class="h-40 skeleton rounded-xl"></div>
            } @else {
              @if (historyData(); as h) {
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                    <p class="text-2xl font-bold text-slate-800">{{ h.summary?.committeesJoined ?? 0 }}</p>
                    <p class="text-xs text-slate-500 mt-1">Committees joined</p>
                  </div>
                  <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                    <p class="text-2xl font-bold text-slate-800">{{ h.summary?.timesReceivedPayout ?? 0 }}</p>
                    <p class="text-xs text-slate-500 mt-1">Completed payouts (recipient)</p>
                  </div>
                  <div class="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                    <p class="text-2xl font-bold text-slate-800">{{ h.summary?.transactionIdsRecorded ?? 0 }}</p>
                    <p class="text-xs text-slate-500 mt-1">Transaction IDs saved</p>
                  </div>
                </div>
                <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  <div>
                    <h3 class="text-sm font-semibold text-slate-700 mb-2">Committees</h3>
                    @if (!h.memberships?.length) {
                      <p class="text-sm text-slate-400">Not on any committee yet.</p>
                    } @else {
                      <div class="overflow-x-auto rounded-xl border border-slate-100">
                        <table class="data-table text-sm">
                          <thead>
                            <tr>
                              <th>Committee</th>
                              <th>Organizer</th>
                              <th>Status</th>
                              <th class="text-right">Monthly pool</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of h.memberships; track row.id) {
                              <tr>
                                <td class="font-medium">{{ row.committee?.name }}</td>
                                <td class="text-slate-600">{{ row.committee?.organizer?.name ?? '—' }}</td>
                                <td><span class="badge badge-muted text-xs">{{ row.committee?.status }}</span></td>
                                <td class="text-right font-mono">{{ row.committee?.monthlyAmount | number }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-slate-700 mb-2">Payout rounds (jahan yeh recipient thay)</h3>
                    @if (!h.payoutRounds?.length) {
                      <p class="text-sm text-slate-400">No payout rounds as recipient yet.</p>
                    } @else {
                      <div class="overflow-x-auto rounded-xl border border-slate-100">
                        <table class="data-table text-sm">
                          <thead>
                            <tr>
                              <th>Committee</th>
                              <th>Round</th>
                              <th>Status</th>
                              <th class="text-right">Amount</th>
                              <th>Tx ID</th>
                              <th>Due</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (r of h.payoutRounds; track r.id) {
                              <tr>
                                <td class="font-medium">{{ r.committee?.name }}</td>
                                <td class="font-mono">#{{ r.roundNumber }}</td>
                                <td><span class="badge badge-muted text-xs">{{ r.status }}</span></td>
                                <td class="text-right font-mono">{{ r.payoutAmount | number }}</td>
                                <td class="font-mono text-xs max-w-[140px] truncate" [title]="r.payoutTransactionId || ''">
                                  {{ r.payoutTransactionId || '—' }}
                                </td>
                                <td class="text-slate-500 text-xs whitespace-nowrap">{{ r.dueDate | date:'mediumDate' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <p class="text-sm text-slate-500">Could not load history.</p>
              }
            }
          </div>
        </div>
      }

      @if (showEditModal() && editing()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)">
          <div class="glass-card p-8 w-full max-w-md animate-slide-up" style="background:white" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-slate-800">Edit {{ editing()?.name }}</h2>
              <button type="button" (click)="closeModals()" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            @if (formError()) { <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{{ formError() }}</div> }
            <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                <input formControlName="name" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input formControlName="phone" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">CNIC</label>
                <input formControlName="cnic" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" formControlName="isActive"/> Account active
              </label>
              <div class="flex gap-3 pt-2">
                <button type="button" (click)="closeModals()" class="flex-1 btn-secondary">Cancel</button>
                <button type="submit" class="flex-1 btn-primary disabled:opacity-50"
                        [disabled]="editForm.invalid || submitting()">{{ submitting() ? 'Saving…' : 'Save' }}</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class MembersComponent implements OnInit, OnDestroy {
  members = signal<any[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  pageSize = signal(10);
  searchQuery = '';
  statusFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  showAddModal = signal(false);
  showEditModal = signal(false);
  showHistoryModal = signal(false);
  editing = signal<any | null>(null);
  historyMember = signal<any | null>(null);
  historyData = signal<{
    memberships: any[];
    payoutRounds: any[];
    summary: { committeesJoined: number; timesReceivedPayout: number; transactionIdsRecorded: number };
  } | null>(null);
  historyLoading = signal(false);
  submitting = signal(false);
  formError = signal('');

  createForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    cnic: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  editForm = this.fb.group({
    name: ['', Validators.required],
    phone: [''],
    cnic: [''],
    isActive: [true],
  });

  private navSub?: Subscription;

  constructor(
    private svc: MemberService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const segs = this.router.url.split('?')[0].split('/').filter(Boolean);
        if (segs.length === 1 && segs[0] === 'members') this.load();
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  load(): void {
    this.loading.set(true);
    this.formError.set('');
    this.svc
      .getAll({
        page: this.page(),
        limit: this.pageSize(),
        search: this.searchQuery || undefined,
        status: this.statusFilter || undefined,
      })
      .subscribe({
        next: (r) => {
          this.members.set(r.data ?? []);
          this.total.set(r.meta?.total ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.snack.open('Could not load members', 'Dismiss');
        },
      });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 400);
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.members().length >= this.pageSize()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  openAdd(): void {
    this.formError.set('');
    this.createForm.reset();
    this.showAddModal.set(true);
  }

  openEdit(m: any): void {
    this.editing.set(m);
    this.editForm.patchValue({
      name: m.name,
      phone: m.phone || '',
      cnic: m.cnic || '',
      isActive: m.isActive,
    });
    this.formError.set('');
    this.showEditModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.editing.set(null);
    this.formError.set('');
  }

  openHistory(m: any): void {
    this.historyMember.set(m);
    this.historyData.set(null);
    this.historyLoading.set(true);
    this.showHistoryModal.set(true);
    this.svc.getHistory(m.id).subscribe({
      next: (r) => {
        this.historyData.set(r?.data ?? null);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
        this.snack.open('Could not load history', 'Dismiss');
        this.closeHistory();
      },
    });
  }

  closeHistory(): void {
    this.showHistoryModal.set(false);
    this.historyMember.set(null);
    this.historyData.set(null);
    this.historyLoading.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    this.submitting.set(true);
    this.svc.create(this.createForm.value).subscribe({
      next: () => {
        this.snack.open('Member created', 'OK');
        this.closeModals();
        this.submitting.set(false);
        this.load();
      },
      error: (err) => {
        this.formError.set(err?.error?.message || 'Create failed');
        this.submitting.set(false);
      },
    });
  }

  submitEdit(): void {
    const id = this.editing()?.id;
    if (!id || this.editForm.invalid) return;
    this.submitting.set(true);
    this.svc.update(id, this.editForm.value).subscribe({
      next: () => {
        this.snack.open('Member updated', 'OK');
        this.closeModals();
        this.submitting.set(false);
        this.load();
      },
      error: (err) => {
        this.formError.set(err?.error?.message || 'Update failed');
        this.submitting.set(false);
      },
    });
  }

  deactivateMember(m: any): void {
    if (!confirm(`Deactivate ${m.name}? They won't be able to log in.`)) return;
    this.svc.deactivate(m.id).subscribe({
      next: () => {
        this.snack.open('Member deactivated', 'OK');
        this.load();
      },
      error: (err) => this.snack.open(err?.error?.message || 'Failed', 'Dismiss'),
    });
  }
}
