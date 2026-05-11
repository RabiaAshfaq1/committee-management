import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, switchMap, EMPTY } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatTabsModule } from '@angular/material/tabs';
import { CommitteeService } from '../../../core/services/committee.service';
import { MemberService } from '../../../core/services/member.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { CommitteeSpinWheelComponent, SpinMember } from './committee-spin-wheel.component';

@Component({
  selector: 'app-committee-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatTabsModule,
    DragDropModule,
    CommitteeSpinWheelComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center gap-3">
        <a routerLink="/committees" class="text-slate-400 hover:text-slate-600 text-sm">← Back</a>
      </div>

      @if (loading()) {
        <div class="glass-card p-6 h-64 skeleton rounded-2xl"></div>
      } @else if (committee()) {
        <div class="glass-card p-6 md:p-8 rounded-2xl shadow-xl border border-white/50 flex flex-wrap gap-4 items-start justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-bold text-slate-800">{{ committee().name }}</h1>
              <span class="badge" [ngClass]="statusClass(committee().status)">{{ committee().status }}</span>
            </div>
            <p class="text-slate-500 mt-2 text-sm">{{ committee().description || 'No description provided.' }}</p>
            <p class="text-emerald-600 font-bold font-mono mt-3">₨{{ committee().monthlyAmount?.toLocaleString() }} <span class="text-xs font-normal text-slate-500">monthly pool</span></p>
          </div>
          @if (canManage()) {
            <button type="button" (click)="openEditCommittee()" class="btn-secondary text-sm shrink-0">Edit committee</button>
          }
        </div>

        @if (canManage()) {
          <p class="text-xs text-slate-500 px-1">
            Add accounts from
            <a routerLink="/members" class="text-indigo-600 hover:underline font-medium">Members</a>, then use “Add to committee” in the Members tab.
          </p>
        }

        <mat-tab-group mat-stretch-tabs="false" class="amanat-tabs rounded-2xl overflow-hidden border border-slate-100 bg-white/90 shadow-sm">
          <mat-tab label="Members">
            <div class="p-4 md:p-6 space-y-6">
              @if (canManage() && (committee().members?.length ?? 0) > 1) {
                <div class="glass-card p-5 rounded-2xl border border-indigo-100">
                  <h3 class="text-base font-bold text-slate-800 mb-1">Turn assignment</h3>
                  <p class="text-xs text-slate-500 mb-4">Method: <strong>{{ committee().turnMethod }}</strong></p>

                  @if (committee().turnMethod === 'MANUAL') {
                    <div cdkDropList (cdkDropListDropped)="drop($event)" class="space-y-2">
                      @for (m of dragMembers(); track m.id) {
                        <div
                          cdkDrag
                          class="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 cursor-grab active:cursor-grabbing"
                        >
                          <span class="text-slate-400">⋮⋮</span>
                          <span class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{{ $index + 1 }}</span>
                          <div class="flex-1 min-w-0">
                            <p class="font-medium text-slate-800 truncate">{{ m.user.name }}</p>
                            <p class="text-xs text-slate-500 truncate">{{ m.user.email }}</p>
                          </div>
                          <span class="text-xs font-mono text-indigo-600">Trust {{ m.user.trustScore ?? '—' }}</span>
                        </div>
                      }
                    </div>
                    <button type="button" class="btn-primary text-sm mt-4 w-full sm:w-auto" [disabled]="turnSaving()" (click)="saveManualOrder()">
                      {{ turnSaving() ? 'Saving…' : 'Save order' }}
                    </button>
                  }

                  @if (committee().turnMethod === 'SPIN') {
                    <app-committee-spin-wheel [members]="spinMembers()" (confirm)="onSpinConfirm($event)" />
                  }

                  @if (committee().turnMethod === 'BIDDING') {
                    <p class="text-xs text-slate-500 mb-3">Enter extra amount each member offers for an earlier turn (highest = turn 1).</p>
                    <div class="space-y-2 max-w-md">
                      @for (m of committee().members; track m.id) {
                        <div class="flex items-center gap-2">
                          <span class="flex-1 text-sm text-slate-700 truncate">{{ m.user.name }}</span>
                          <input
                            type="number"
                            min="0"
                            class="w-28 px-2 py-1.5 rounded-lg border text-sm font-mono"
                            [value]="bidDraft()[m.userId] ?? 0"
                            (input)="setBid(m.userId, $any($event.target).value)"
                          />
                        </div>
                      }
                    </div>
                    <button type="button" class="btn-primary text-sm mt-4" [disabled]="turnSaving()" (click)="saveBiddingOrder()">
                      {{ turnSaving() ? 'Saving…' : 'Apply bid order' }}
                    </button>
                  }
                </div>
              }

              <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 class="text-lg font-bold text-slate-800">Roster ({{ committee().members?.length }}/{{ committee().totalSlots }})</h3>
                @if (canManage() && (committee().members?.length ?? 0) < committee().totalSlots) {
                  <button type="button" (click)="openAddMember()" class="btn-primary text-xs py-1.5 px-3">+ Add to committee</button>
                }
              </div>
              <div class="overflow-x-auto rounded-xl border border-slate-100">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Turn</th>
                      <th>Member</th>
                      <th>Trust</th>
                      <th>Latest pay</th>
                      @if (canManage()) {
                        <th></th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (m of committee().members; track m.id) {
                      <tr>
                        <td>
                          <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{{ m.turnNumber }}</div>
                        </td>
                        <td>
                          <div class="flex items-center gap-2">
                            <div
                              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style="background: linear-gradient(135deg,#6366F1,#8B5CF6)"
                            >
                              {{ initials(m.user?.name) }}
                            </div>
                            <div class="min-w-0">
                              <p class="font-medium text-slate-800 truncate">{{ m.user.name }}</p>
                              <p class="text-xs text-slate-500 truncate">{{ m.user.email }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="font-mono text-sm text-indigo-600">{{ m.user.trustScore ?? '—' }}</td>
                        <td>{{ latestPayStatus(m.userId) }}</td>
                        @if (canManage()) {
                          <td>
                            <button type="button" class="btn-secondary text-xs py-1 px-2 text-red-600 border-red-100" (click)="removeFromCommittee(m)">Remove</button>
                          </td>
                        }
                      </tr>
                    }
                    @if (!committee().members?.length) {
                      <tr>
                        <td [attr.colspan]="canManage() ? 5 : 4" class="text-center py-8 text-slate-500">No members on this roster yet.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Rounds">
            <div class="p-4 md:p-6 space-y-3">
              @for (r of committee().rounds; track r.id) {
                <div
                  class="glass-card p-4 rounded-xl border flex flex-wrap justify-between gap-2"
                  [class.ring-2]="r.status === 'ACTIVE'"
                  [class.ring-indigo-200]="r.status === 'ACTIVE'"
                >
                  <div>
                    <p class="text-xs font-semibold text-slate-400">ROUND {{ r.roundNumber }}</p>
                    <p class="font-medium text-slate-800">Recipient: {{ payoutName(r) }}</p>
                    <p class="text-xs text-slate-500 mt-1">{{ r.status }}</p>
                  </div>
                  @if (r.status === 'ACTIVE') {
                    <a routerLink="/rounds" class="btn-secondary text-xs py-1.5 px-3 self-center">Open rounds →</a>
                  }
                </div>
              }
              @if (!committee().rounds?.length) {
                <p class="text-slate-500 text-sm">No rounds yet.</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Payments">
            <div class="p-4 md:p-6 overflow-x-auto">
              <table class="data-table text-sm">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of flatPayments(); track row.id) {
                    <tr>
                      <td class="font-mono">#{{ row.roundNumber }}</td>
                      <td>{{ row.userName }}</td>
                      <td class="font-mono">₨{{ row.amount | number: '1.0-0' }}</td>
                      <td>
                        <span class="badge text-[10px]" [ngClass]="row.status === 'PAID' ? 'badge-success' : 'badge-warning'">{{ row.status }}</span>
                      </td>
                    </tr>
                  }
                  @if (!flatPayments().length) {
                    <tr>
                      <td colspan="4" class="text-center py-8 text-slate-400">No payment rows yet.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-tab>
        </mat-tab-group>
      } @else {
        <div class="glass-card p-12 text-center text-slate-500 rounded-2xl">Committee not found.</div>
      }

      @if (showEditModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)"
          role="dialog"
          aria-modal="true"
        >
          <div class="glass-card p-8 w-full max-w-lg rounded-2xl" style="background:white" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-slate-800">Edit committee</h2>
              <button type="button" (click)="closeModals()" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            @if (formErr()) {
              <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{{ formErr() }}</div>
            }
            <form [formGroup]="editCommitteeForm" (ngSubmit)="saveCommittee()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                <input formControlName="name" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea formControlName="description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select formControlName="status" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Monthly amount (₨)</label>
                <input formControlName="monthlyAmount" type="number" min="1" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 font-mono" />
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="flex-1 btn-secondary" (click)="closeModals()">Cancel</button>
                <button type="submit" class="flex-1 btn-primary disabled:opacity-50" [disabled]="editCommitteeForm.invalid || saving()">
                  {{ saving() ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (showAddMemberModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)"
          role="dialog"
          aria-modal="true"
        >
          <div class="glass-card p-8 w-full max-w-lg rounded-2xl" style="background:white" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-slate-800">Add user to roster</h2>
              <button type="button" (click)="closeModals()" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <p class="text-sm text-slate-500 mb-4">Pick an account and assign a turn slot.</p>
            @if (formErr()) {
              <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{{ formErr() }}</div>
            }
            <form [formGroup]="addMemberForm" (ngSubmit)="submitAddMember()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Member *</label>
                <select formControlName="userId" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                  @if (!availableUsers().length) {
                    <option value="">No eligible accounts</option>
                  } @else {
                    @for (u of availableUsers(); track u.id) {
                      <option [value]="u.id">{{ u.name }} · {{ u.email }}</option>
                    }
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Turn # *</label>
                <input
                  formControlName="turnNumber"
                  type="number"
                  [min]="1"
                  [max]="committee()?.totalSlots"
                  class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 font-mono"
                />
                <p class="text-xs text-slate-400 mt-1">Suggested: {{ nextSuggestedTurn() }}</p>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="flex-1 btn-secondary" (click)="closeModals()">Cancel</button>
                <button
                  type="submit"
                  class="flex-1 btn-primary disabled:opacity-50"
                  [disabled]="addMemberForm.invalid || saving() || !availableUsers().length"
                >
                  {{ saving() ? 'Adding…' : 'Add' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .amanat-tabs .mat-mdc-tab-labels {
        background: #f8fafc;
      }
      :host ::ng-deep .amanat-tabs .mdc-tab--active .mdc-tab__text-label {
        color: #4f46e5 !important;
        font-weight: 600;
      }
    `,
  ],
})
export class CommitteeDetailComponent implements OnInit, OnDestroy {
  committee = signal<any>(null);
  loading = signal(true);
  showEditModal = signal(false);
  showAddMemberModal = signal(false);
  saving = signal(false);
  turnSaving = signal(false);
  formErr = signal('');
  availableUsers = signal<any[]>([]);
  dragMembers = signal<any[]>([]);
  bidDraft = signal<Record<string, number>>({});

  spinMembers = computed((): SpinMember[] => {
    const m = this.committee()?.members || [];
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
    return m.map((x: any, i: number) => ({
      id: x.id,
      label: x.user?.name || 'Member',
      color: colors[i % colors.length],
    }));
  });

  editCommitteeForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    status: ['ACTIVE', Validators.required],
    monthlyAmount: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  addMemberForm = this.fb.group({
    userId: ['', Validators.required],
    turnNumber: [1, [Validators.required, Validators.min(1)]],
  });

  private sub?: Subscription;
  private committeeId = '';

  constructor(
    private route: ActivatedRoute,
    private svc: CommitteeService,
    private memberSvc: MemberService,
    public auth: AuthService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private toast: ToastrService,
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.committeeId = id || '';
          this.loading.set(!!id);
          this.committee.set(null);
          if (!id) {
            this.loading.set(false);
            return EMPTY;
          }
          return this.svc.getById(id);
        }),
      )
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          if (data) {
            this.committee.set(data);
            this.syncDragFromCommittee(data);
            this.initBids(data);
          }
          this.loading.set(false);
        },
        error: () => {
          this.snack.open('Could not load committee', 'Dismiss');
          this.toast.error('Could not load committee');
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  statusClass(s: string): string {
    if (s === 'ACTIVE') return 'badge-success';
    if (s === 'PAUSED') return 'badge-warning';
    return 'badge-muted';
  }

  initials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  flatPayments(): { id: string; roundNumber: number; userName: string; amount: number; status: string }[] {
    const c = this.committee();
    if (!c?.rounds) return [];
    const rows: { id: string; roundNumber: number; userName: string; amount: number; status: string }[] = [];
    for (const r of c.rounds) {
      for (const p of r.payments || []) {
        rows.push({
          id: p.id,
          roundNumber: r.roundNumber,
          userName: p.user?.name || '—',
          amount: p.amount,
          status: p.status,
        });
      }
    }
    return rows;
  }

  payoutName(r: any): string {
    const uid = r.payoutUserId;
    const members = this.committee()?.members || [];
    const slot = members.find((m: any) => m.userId === uid);
    return slot?.user?.name || '—';
  }

  latestPayStatus(userId: string): string {
    const c = this.committee();
    if (!c?.rounds?.length) return '—';
    const sorted = [...c.rounds].sort((a: any, b: any) => b.roundNumber - a.roundNumber);
    for (const r of sorted) {
      const pay = (r.payments || []).find((p: any) => p.userId === userId);
      if (pay) return pay.status;
    }
    return '—';
  }

  syncDragFromCommittee(data: any): void {
    const list = [...(data.members || [])].sort((a: any, b: any) => a.turnNumber - b.turnNumber);
    this.dragMembers.set(list);
  }

  initBids(data: any): void {
    const draft: Record<string, number> = {};
    for (const m of data.members || []) {
      draft[m.userId] = 0;
    }
    this.bidDraft.set(draft);
  }

  setBid(userId: string, val: string): void {
    const n = Math.max(0, Number(val) || 0);
    this.bidDraft.update((d) => ({ ...d, [userId]: n }));
  }

  drop(event: CdkDragDrop<any[]>): void {
    const list = [...this.dragMembers()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.dragMembers.set(list);
  }

  saveManualOrder(): void {
    const assignments = this.dragMembers().map((m: any, idx: number) => ({
      memberId: m.id,
      turnNumber: idx + 1,
    }));
    this.postAssignments(assignments);
  }

  onSpinConfirm(orderIds: string[]): void {
    const assignments = orderIds.map((memberRowId, idx) => ({
      memberId: memberRowId,
      turnNumber: idx + 1,
    }));
    this.postAssignments(assignments);
  }

  saveBiddingOrder(): void {
    const members = [...(this.committee()?.members || [])];
    const bids = this.bidDraft();
    members.sort((a: any, b: any) => (bids[b.userId] ?? 0) - (bids[a.userId] ?? 0));
    const assignments = members.map((m: any, idx: number) => ({ memberId: m.id, turnNumber: idx + 1 }));
    this.postAssignments(assignments);
  }

  postAssignments(assignments: { memberId: string; turnNumber: number }[]): void {
    this.turnSaving.set(true);
    this.svc.assignTurns(this.committeeId, { assignments }).subscribe({
      next: () => {
        this.turnSaving.set(false);
        this.toast.success('Turn order saved');
        this.snack.open('Turn order saved', 'OK');
        this.reload();
      },
      error: (err) => {
        this.turnSaving.set(false);
        const msg = err?.error?.message || 'Could not save turns';
        this.toast.error(msg);
        this.snack.open(msg, 'Dismiss');
      },
    });
  }

  canManage(): boolean {
    const u = this.auth.currentUser;
    const c = this.committee();
    if (!u || !c) return false;
    return this.auth.isAdmin && c.adminId === u.id;
  }

  openEditCommittee(): void {
    const c = this.committee();
    if (!c) return;
    this.formErr.set('');
    this.editCommitteeForm.patchValue({
      name: c.name,
      description: c.description ?? '',
      status: c.status,
      monthlyAmount: c.monthlyAmount,
    });
    this.showEditModal.set(true);
  }

  openAddMember(): void {
    this.formErr.set('');
    this.prefillAddTurn();
    this.loadEligibleUsers();
    this.showAddMemberModal.set(true);
  }

  prefillAddTurn(): void {
    const c = this.committee();
    if (!c) return;
    this.addMemberForm.patchValue({
      userId: '',
      turnNumber: this.nextSuggestedTurn(),
    });
  }

  nextSuggestedTurn(): number {
    const c = this.committee();
    if (!c) return 1;
    const used = new Set((c.members ?? []).map((m: any) => m.turnNumber));
    const cap = Number(c.totalSlots) || 1;
    for (let t = 1; t <= cap; t++) {
      if (!used.has(t)) return t;
    }
    return cap;
  }

  loadEligibleUsers(): void {
    this.memberSvc.getAll({ page: 1, limit: 200, status: 'active' }).subscribe({
      next: (res) => {
        const joined = new Set((this.committee()?.members ?? []).map((m: any) => m.userId));
        const list = (res.data ?? []).filter((u: any) => !joined.has(u.id));
        this.availableUsers.set(list);
        const firstId = list[0]?.id;
        if (firstId && !this.addMemberForm.value.userId) {
          this.addMemberForm.patchValue({ userId: firstId });
        }
      },
      error: () => {
        this.snack.open('Could not load users list', 'Dismiss');
        this.toast.error('Could not load users');
      },
    });
  }

  closeModals(): void {
    this.showEditModal.set(false);
    this.showAddMemberModal.set(false);
    this.formErr.set('');
  }

  saveCommittee(): void {
    const id = this.committeeId;
    if (!id || this.editCommitteeForm.invalid) return;
    this.saving.set(true);
    const v = this.editCommitteeForm.value;
    this.svc
      .update(id, {
        name: v.name,
        description: v.description || null,
        status: v.status,
        monthlyAmount: Number(v.monthlyAmount),
      })
      .subscribe({
        next: () => {
          this.toast.success('Committee updated');
          this.snack.open('Committee updated', 'OK');
          this.saving.set(false);
          this.closeModals();
          this.reload();
        },
        error: (err) => {
          this.formErr.set(err?.error?.message || 'Update failed');
          this.saving.set(false);
          this.toast.error(this.formErr());
        },
      });
  }

  reload(): void {
    if (!this.committeeId) return;
    this.loading.set(true);
    this.svc.getById(this.committeeId).subscribe({
      next: (res) => {
        const data = res.data;
        this.committee.set(data);
        if (data) {
          this.syncDragFromCommittee(data);
          this.initBids(data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Refresh failed');
        this.snack.open('Refresh failed', 'Dismiss');
      },
    });
  }

  submitAddMember(): void {
    const id = this.committeeId;
    const v = this.addMemberForm.value;
    if (!id || !v.userId || v.turnNumber == null) return;
    this.saving.set(true);
    this.svc
      .addMember(id, {
        userId: v.userId,
        turnNumber: Number(v.turnNumber),
      })
      .subscribe({
        next: () => {
          this.toast.success('Member added');
          this.snack.open('Added to committee roster', 'OK');
          this.saving.set(false);
          this.closeModals();
          this.reload();
        },
        error: (err) => {
          this.formErr.set(err?.error?.message || 'Could not add');
          this.saving.set(false);
          this.toast.error(this.formErr());
        },
      });
  }

  removeFromCommittee(cm: any): void {
    if (!confirm(`Remove ${cm.user?.name} from this committee roster?`)) return;
    this.svc.removeMember(this.committeeId, cm.id).subscribe({
      next: () => {
        this.toast.success('Removed from committee');
        this.snack.open('Removed from committee', 'OK');
        this.reload();
      },
      error: (err) => {
        const m = err?.error?.message || 'Remove failed';
        this.toast.error(m);
        this.snack.open(m, 'Dismiss');
      },
    });
  }
}
