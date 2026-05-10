import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, switchMap, EMPTY } from 'rxjs';
import { CommitteeService } from '../../../core/services/committee.service';
import { MemberService } from '../../../core/services/member.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-committee-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex items-center gap-3">
        <a routerLink="/committees" class="text-slate-400 hover:text-slate-600">← Back</a>
      </div>

      <!-- Note: /members creates user accounts. Rosters are managed here with "Add member". -->
      @if (loading()) {
        <div class="glass-card p-6 h-64 skeleton"></div>
      } @else if (committee()) {
        <!-- Header -->
        <div class="glass-card p-6 flex flex-wrap gap-4 items-start justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold text-slate-800">{{ committee().name }}</h1>
              <span class="badge" [ngClass]="committee().status==='ACTIVE'?'badge-success':'badge-warning'">
                {{ committee().status }}
              </span>
            </div>
            <p class="text-slate-500 mt-1">{{ committee().description || 'No description provided.' }}</p>
          </div>
          <div class="flex gap-2">
            @if (canManage()) {
              <button type="button" (click)="openEditCommittee()" class="btn-secondary text-sm">Edit committee</button>
            }
          </div>
        </div>

        @if (canManage()) {
          <p class="text-xs text-slate-500 px-1">
            Users from <a routerLink="/members" class="text-indigo-600 hover:underline font-medium">Members</a> appear in "Add to committee" once they have an account—they are not joined automatically.
          </p>
        }

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div class="xl:col-span-2 space-y-6">
            <div class="glass-card p-6">
              <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 class="text-lg font-bold text-slate-800">Members ({{ committee().members?.length }}/{{ committee().totalMembers }})</h3>
                @if (canManage() && (committee().members?.length ?? 0) < committee().totalMembers) {
                  <button type="button" (click)="openAddMember()" class="btn-primary text-xs py-1.5 px-3">+ Add to committee</button>
                }
              </div>
              <div class="overflow-x-auto">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Turn</th>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Joined</th>
                      @if (canManage()) { <th></th> }
                    </tr>
                  </thead>
                  <tbody>
                    @for (m of committee().members; track m.id) {
                      <tr>
                        <td>
                          <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">{{ m.turnNumber }}</div>
                        </td>
                        <td class="font-medium text-slate-700">{{ m.user.name }}</td>
                        <td class="text-slate-500 text-sm">{{ m.user.email }}</td>
                        <td class="text-slate-500 text-sm">{{ m.createdAt | date:'mediumDate' }}</td>
                        @if (canManage()) {
                          <td>
                            <button type="button" class="btn-secondary text-xs py-1 px-2 text-red-600 border-red-100"
                                    (click)="removeFromCommittee(m)">Remove</button>
                          </td>
                        }
                      </tr>
                    }
                    @if (!committee().members?.length) {
                      <tr><td [attr.colspan]="canManage()?5:4" class="text-center py-4 text-slate-500">No one on this roster yet</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="glass-card p-6">
              <h3 class="text-lg font-bold text-slate-800 mb-4">Rounds overview</h3>
              <div class="space-y-3">
                @for (r of committee().rounds; track r.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p class="font-medium text-slate-700">Round {{ r.roundNumber }}</p>
                      <p class="text-xs text-slate-500 mt-0.5">Status: {{ r.status }}</p>
                    </div>
                    @if (r.status === 'ACTIVE') {
                      <a routerLink="/rounds" class="btn-secondary text-xs py-1.5 px-3">Rounds →</a>
                    } @else {
                      <span class="text-xs text-slate-400"> — </span>
                    }
                  </div>
                }
                @if (!committee().rounds?.length) {
                  <p class="text-slate-500 text-sm">No rounds yet. Start one from <a routerLink="/rounds" class="text-indigo-600 hover:underline">Rounds</a>.</p>
                }
              </div>
            </div>
          </div>

          <!-- Sidebar Info -->
          <div class="space-y-6">
            <div class="glass-card p-6">
              <h3 class="text-base font-bold text-slate-800 mb-4">Details</h3>
              <div class="space-y-4">
                <div>
                  <p class="text-xs text-slate-400">Monthly pool (total collected)</p>
                  <p class="font-bold text-slate-700 text-lg font-mono">₨{{ committee().monthlyAmount?.toLocaleString() }}</p>
                  <p class="text-[10px] text-slate-400 mt-1">Example: two people can pay 5,000 + 5,000 for a 10,000 pool—set custom splits when starting a round.</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Draw mode</p>
                  <p class="font-medium text-slate-700">{{ committee().turnAssignment }}</p>
                </div>
                <hr class="border-slate-100"/>
                <div>
                  <p class="text-xs text-slate-400">Start Date</p>
                  <p class="text-slate-700">{{ committee().startDate | date:'mediumDate' }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Duration</p>
                  <p class="text-slate-700">{{ committee().durationMonths }} Months</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Organizer</p>
                  <p class="text-slate-700 flex items-center gap-2 mt-1">
                    <span class="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">{{ committee().organizer?.name?.[0] }}</span>
                    {{ committee().organizer?.name }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <div class="glass-card p-12 text-center text-slate-500">
          Committee not found.
        </div>
      }

      @if (showEditModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)"
             role="dialog" aria-modal="true">
          <div class="glass-card p-8 w-full max-w-lg" style="background:white" (click)="$event.stopPropagation()">
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
                <input formControlName="name" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea formControlName="description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 resize-none"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select formControlName="status"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Monthly amount (₨)</label>
                <input formControlName="monthlyAmount" type="number" min="1" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 font-mono"/>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="flex-1 btn-secondary" (click)="closeModals()">Cancel</button>
                <button type="submit" class="flex-1 btn-primary disabled:opacity-50"
                        [disabled]="editCommitteeForm.invalid || saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (showAddMemberModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)"
             role="dialog" aria-modal="true">
          <div class="glass-card p-8 w-full max-w-lg" style="background:white" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-slate-800">Add user to roster</h2>
              <button type="button" (click)="closeModals()" class="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <p class="text-sm text-slate-500 mb-4">Pick an existing account and assign their payout turn.</p>
            @if (formErr()) {
              <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{{ formErr() }}</div>
            }
            <form [formGroup]="addMemberForm" (ngSubmit)="submitAddMember()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Member *</label>
                <select formControlName="userId"
                        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50">
                  @if (!availableUsers().length) {
                    <option value="">No eligible accounts — create users under Members first</option>
                  } @else {
                    @for (u of availableUsers(); track u.id) {
                      <option [value]="u.id">{{ u.name }} · {{ u.email }}</option>
                    }
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Turn # *</label>
                <input formControlName="turnNumber" type="number" [min]="1" [max]="committee()?.totalMembers"
                       class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 font-mono"/>
                <p class="text-xs text-slate-400 mt-1">Suggested next free slot: {{ nextSuggestedTurn() }}</p>
              </div>
              <div class="flex gap-3 pt-2">
                <button type="button" class="flex-1 btn-secondary" (click)="closeModals()">Cancel</button>
                <button type="submit" class="flex-1 btn-primary disabled:opacity-50"
                        [disabled]="addMemberForm.invalid || saving() || !availableUsers().length">
                  {{ saving() ? 'Adding…' : 'Add to committee' }}</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class CommitteeDetailComponent implements OnInit, OnDestroy {
  committee = signal<any>(null);
  loading = signal(true);
  showEditModal = signal(false);
  showAddMemberModal = signal(false);
  saving = signal(false);
  formErr = signal('');
  availableUsers = signal<any[]>([]);

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
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap
      .pipe(switchMap((params) => {
        const id = params.get('id');
        this.committeeId = id || '';
        this.loading.set(!!id);
        this.committee.set(null);
        if (!id) {
          this.loading.set(false);
          return EMPTY;
        }
        return this.svc.getById(id);
      }))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          if (data) this.committee.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.snack.open('Could not load committee', 'Dismiss');
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  canManage(): boolean {
    const u = this.auth.currentUser;
    const c = this.committee();
    if (!u || !c) return false;
    return this.auth.isOrganizer && c.organizerId === u.id;
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

  /** First turn slot 1…N not already assigned */
  nextSuggestedTurn(): number {
    const c = this.committee();
    if (!c) return 1;
    const used = new Set((c.members ?? []).map((m: any) => m.turnNumber));
    const cap = Number(c.totalMembers) || 1;
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
      error: () => this.snack.open('Could not load users list', 'Dismiss'),
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
          this.snack.open('Committee updated', 'OK');
          this.saving.set(false);
          this.closeModals();
          this.reload();
        },
        error: (err) => {
          this.formErr.set(err?.error?.message || 'Update failed');
          this.saving.set(false);
        },
      });
  }

  reload(): void {
    if (!this.committeeId) return;
    this.loading.set(true);
    this.svc.getById(this.committeeId).subscribe({
      next: (res) => {
        this.committee.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
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
          this.snack.open('Added to committee roster', 'OK');
          this.saving.set(false);
          this.closeModals();
          this.reload();
        },
        error: (err) => {
          this.formErr.set(err?.error?.message || 'Could not add');
          this.saving.set(false);
        },
      });
  }

  removeFromCommittee(cm: any): void {
    if (!confirm(`Remove ${cm.user?.name} from this committee roster?`)) return;
    this.svc.removeMember(this.committeeId, cm.id).subscribe({
      next: () => {
        this.snack.open('Removed from committee', 'OK');
        this.reload();
      },
      error: (err) => this.snack.open(err?.error?.message || 'Remove failed', 'Dismiss'),
    });
  }
}
