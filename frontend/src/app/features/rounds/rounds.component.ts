import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RoundService } from '../../core/services/round.service';
import { CommitteeService } from '../../core/services/committee.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-rounds',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 animate-fade-in px-2">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-slate-800">Rounds</h1>
        <p class="text-slate-500 text-sm mt-1">
          Each month members contribute toward the committee <strong>monthly pool</strong> (equal or custom split). The recipient enters a <strong>transaction ID</strong> as proof—money is not tracked inside the app.
        </p>
      </div>

      <div class="glass-card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <label class="text-sm font-medium text-slate-700">Committee</label>
        <select [(ngModel)]="committeeNgModel" (ngModelChange)="onCommitteeChange($event)"
                class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
          @for (c of committees(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select>
        @if (selectedId()) {
          <a [routerLink]="['/committees', selectedId()]" class="btn-secondary text-xs py-2 px-3 text-center whitespace-nowrap">Committee detail</a>
        }
      </div>

      @if (spinning()) {
        <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div class="glass-card p-10 text-center animate-pulse" style="background:white">
            <p class="text-4xl mb-2">🎲</p>
            <p class="font-bold text-indigo-700">Drawing recipient…</p>
          </div>
        </div>
      }

      @if (!selectedId()) {
        <p class="text-center text-slate-500">Create a committee first.</p>
      } @else if (loading()) {
        <div class="glass-card h-48 skeleton"></div>
      } @else {
        @if (auth.isOrganizer && meta()?.membersReady && !hasActive()) {
          <div class="flex justify-center">
            <button type="button" (click)="openStart()" class="btn-primary text-sm px-6 py-2.5 rounded-xl">+ New round</button>
          </div>
        }

        <div class="space-y-4">
          @for (r of rounds(); track r.id) {
            <div class="glass-card p-5 border border-slate-100"
                 [class.ring-2]="r.status==='ACTIVE'" [class.ring-indigo-200]="r.status==='ACTIVE'">
              <div class="flex flex-wrap justify-between gap-2">
                <div>
                  <span class="text-xs font-semibold text-slate-400">ROUND {{ r.roundNumber }}</span>
                  <p class="font-bold text-slate-800">Pool: <span class="font-mono text-indigo-600">₨{{ r.payoutAmount?.toLocaleString() }}</span></p>
                  <p class="text-sm text-slate-600 mt-1">Recipient: <strong>{{ payoutName(r) }}</strong></p>
                  @if (r.payoutTransactionId) {
                    <p class="text-xs text-emerald-700 mt-2 font-mono bg-emerald-50 inline-block px-2 py-1 rounded">Tx: {{ r.payoutTransactionId }}</p>
                  }
                </div>
                <span class="badge" [ngClass]="r.status==='COMPLETED'?'badge-success':r.status==='ACTIVE'?'badge-info':'badge-muted'">{{ r.status }}</span>
              </div>

              <div class="mt-3 text-xs text-slate-500">
                <span class="font-semibold text-slate-600">This month’s contributions:</span>
                @for (s of r.contributionSplits || []; track s.id) {
                  <span class="inline-block mr-2 mt-1">{{ s.member?.user?.name }}: ₨{{ s.amount?.toLocaleString() }}</span>
                }
              </div>

              @if (r.status === 'ACTIVE') {
                <div class="mt-4 flex flex-wrap gap-2">
                  @if (canSubmitTx(r)) {
                    <input [(ngModel)]="txDraft[r.id]" placeholder="Transaction ID"
                           class="flex-1 min-w-40 px-3 py-2 rounded-lg border text-sm font-mono"/>
                    <button type="button" class="btn-primary text-xs py-2 px-3" (click)="saveTx(r)" [disabled]="txBusy()===r.id">Save</button>
                  }
                  @if (auth.isOrganizer && isMyCommittee()) {
                    <button type="button" class="btn-secondary text-xs py-2 px-3" (click)="complete(r)" [disabled]="busyId()===r.id">Complete round</button>
                  }
                </div>
              }
            </div>
          }
          @if (!rounds().length) {
            <p class="text-center text-slate-500 py-8">No rounds yet. The organizer can start one with “New round” when the roster is full.</p>
          }
        </div>
      }

      @if (showStart()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="closeStart()">
          <div class="glass-card p-6 w-full max-w-lg" style="background:white" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-slate-800 mb-2">Start round</h2>
            <p class="text-xs text-slate-500 mb-4">
              Draw mode is set on the committee: <strong>{{ meta()?.turnAssignment }}</strong>.
              Manual or bidding: choose the recipient below. Random: the server picks the recipient.
              For bidding without bids in the app, pick the winning member here.
            </p>
            @if (startModalBooting()) {
              <div class="h-32 skeleton rounded-xl mb-4"></div>
            } @else {
              @if (meta()?.turnAssignment !== 'RANDOM') {
                <label class="block text-sm font-medium mb-1">Recipient</label>
                <select [(ngModel)]="startPayoutUserId" class="w-full mb-3 px-3 py-2 rounded-xl border text-sm">
                  @for (m of startMembers(); track m.id) {
                    <option [value]="m.userId">{{ m.user?.name }}</option>
                  }
                </select>
              }
              <label class="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" [ngModel]="useCustomSplits" (ngModelChange)="onCustomSplitsChange($event)"/>
                Custom split (default: equal shares for everyone on the roster)
              </label>
              @if (useCustomSplits) {
                <div class="space-y-2 mb-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-3">
                  @for (slot of startMembers(); track slot.id) {
                    <div class="flex gap-2 items-center text-sm">
                      <span class="flex-1 truncate">{{ slot.user?.name }}</span>
                      <input type="number" min="0" step="0.01" [(ngModel)]="splitDraft[slot.id]"
                             class="w-28 px-2 py-1.5 rounded-lg border text-sm font-mono"/>
                    </div>
                  }
                </div>
                <p class="text-[11px] text-slate-500 mb-3">
                  Sum: <strong class="font-mono">{{ splitSum() | number:'1.2-2' }}</strong>
                  / <strong class="font-mono">{{ meta()?.monthlyAmount | number:'1.2-2' }}</strong>
                  (must match the monthly pool)
                </p>
              }
              <label class="block text-xs text-slate-500 mb-1">Due date (optional)</label>
              <input type="datetime-local" [(ngModel)]="dueDraft" class="w-full mb-4 px-3 py-2 rounded-xl border text-sm"/>
              <div class="flex gap-2">
                <button type="button" class="flex-1 btn-secondary" (click)="closeStart()">Cancel</button>
                <button type="button" class="flex-1 btn-primary" (click)="submitStart()" [disabled]="starting() || startModalBooting()">{{ starting() ? '…' : 'Start' }}</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class RoundsComponent implements OnInit {
  committees = signal<any[]>([]);
  rounds = signal<any[]>([]);
  loading = signal(false);
  starting = signal(false);
  busyId = signal<string | null>(null);
  txBusy = signal<string | null>(null);
  selectedId = signal('');
  committeeNgModel = '';
  meta = signal<{ membersReady: boolean; monthlyAmount: number; turnAssignment: string } | null>(null);
  showStart = signal(false);
  startModalBooting = signal(false);
  prefetchedMembers = signal<any[]>([]);
  dueDraft = '';
  startPayoutUserId = '';
  useCustomSplits = false;
  splitDraft: Record<string, string> = {};
  spinning = signal(false);
  txDraft: Record<string, string> = {};

  constructor(
    private roundSvc: RoundService,
    private committeeSvc: CommitteeService,
    public auth: AuthService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.committeeSvc.getAll({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        const rows = res.data ?? [];
        this.committees.set(rows);
        if (rows[0]?.id) {
          this.committeeNgModel = rows[0].id;
          this.onCommitteeChange(rows[0].id);
        }
      },
      error: () => this.snack.open('Could not load committees', 'OK'),
    });
  }

  startMembers(): any[] {
    const p = this.prefetchedMembers();
    if (p.length) return p;
    return this.rounds()[0]?.committee?.members ?? [];
  }

  isMyCommittee(): boolean {
    const c = this.committees().find((x) => x.id === this.selectedId());
    return c?.organizerId === this.auth.currentUser?.id;
  }

  hasActive(): boolean {
    return !!this.rounds().find((r) => r.status === 'ACTIVE');
  }

  onCommitteeChange(id: string) {
    this.selectedId.set(id || '');
    if (!id) return;
    const c = this.committees().find((x) => x.id === id);
    const cnt = c?._count?.members ?? 0;
    const tot = c?.totalMembers ?? 0;
    this.meta.set({
      membersReady: tot > 0 && cnt >= tot,
      monthlyAmount: c?.monthlyAmount ?? 0,
      turnAssignment: c?.turnAssignment ?? 'RANDOM',
    });
    this.loadRounds(id);
  }

  loadRounds(id: string) {
    this.loading.set(true);
    this.roundSvc.getByCommittee(id).subscribe({
      next: (res) => {
        const list = res.data ?? [];
        this.rounds.set(list);
        const first = list[0];
        if (first?.committee) {
          const m = first.committee.members?.length ?? 0;
          const totMem = first.committee.totalMembers ?? 0;
          this.meta.set({
            membersReady: totMem > 0 && m >= totMem,
            monthlyAmount: first.committee.monthlyAmount,
            turnAssignment: first.committee.turnAssignment,
          });
        }
        const mem = first?.committee?.members ?? [];
        if (mem.length && !this.startPayoutUserId) this.startPayoutUserId = mem[0].userId;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Could not load rounds', 'OK');
      },
    });
  }

  payoutName(r: any): string {
    const uid = r.payoutUserId;
    const members = r.committee?.members || [];
    const slot = members.find((m: any) => m.userId === uid);
    return slot?.user?.name || '—';
  }

  canSubmitTx(r: any): boolean {
    if (r.status !== 'ACTIVE') return false;
    if (this.auth.isOrganizer && this.isMyCommittee()) return true;
    return r.payoutUserId === this.auth.currentUser?.id;
  }

  splitSum(): number {
    let s = 0;
    for (const k of Object.keys(this.splitDraft)) {
      const n = parseFloat(this.splitDraft[k]);
      if (!isNaN(n)) s += n;
    }
    return Math.round(s * 100) / 100;
  }

  saveTx(r: any) {
    const tid = (this.txDraft[r.id] || '').trim();
    if (!tid) return;
    this.txBusy.set(r.id);
    this.roundSvc.submitPayoutTx(r.id, tid).subscribe({
      next: () => {
        this.snack.open('Transaction ID saved', 'OK');
        this.txBusy.set(null);
        this.loadRounds(this.selectedId());
      },
      error: (e) => {
        this.txBusy.set(null);
        this.snack.open(e?.error?.message || 'Error', 'OK');
      },
    });
  }

  complete(r: any) {
    if (!confirm('Mark this round as completed?')) return;
    this.busyId.set(r.id);
    this.roundSvc.complete(r.id).subscribe({
      next: () => {
        this.snack.open('Round completed', 'OK');
        this.busyId.set(null);
        this.loadRounds(this.selectedId());
      },
      error: (e) => {
        this.busyId.set(null);
        this.snack.open(e?.error?.message || 'Error', 'OK');
      },
    });
  }

  private prefillEqualSplits(members: any[]) {
    const pool = Number(this.meta()?.monthlyAmount ?? 0);
    const n = members.length;
    const each = n ? Math.round((pool / n) * 100) / 100 : 0;
    this.splitDraft = {};
    for (const m of members) this.splitDraft[m.id] = String(each);
  }

  private applyOpenStartWithMembers(members: any[]) {
    this.startPayoutUserId = members[0]?.userId || '';
    this.useCustomSplits = false;
    this.splitDraft = {};
    this.startModalBooting.set(false);
    this.showStart.set(true);
  }

  onCustomSplitsChange(checked: boolean) {
    this.useCustomSplits = checked;
    const members = this.startMembers();
    if (checked && members.length) this.prefillEqualSplits(members);
    else this.splitDraft = {};
  }

  openStart() {
    this.dueDraft = '';
    this.prefetchedMembers.set([]);
    this.useCustomSplits = false;
    this.splitDraft = {};
    const existing = this.rounds()[0]?.committee?.members;
    if (existing?.length) {
      this.applyOpenStartWithMembers(existing);
      return;
    }
    this.startModalBooting.set(true);
    this.showStart.set(true);
    this.committeeSvc.getById(this.selectedId()).subscribe({
      next: (res) => {
        const mem = res.data?.members ?? [];
        if (!mem.length) {
          this.startModalBooting.set(false);
          this.closeStart();
          this.snack.open('Add members to the committee before starting a round', 'OK');
          return;
        }
        this.prefetchedMembers.set(mem);
        this.applyOpenStartWithMembers(mem);
      },
      error: () => {
        this.startModalBooting.set(false);
        this.closeStart();
        this.snack.open('Could not load committee members', 'OK');
      },
    });
  }

  closeStart() {
    this.showStart.set(false);
    this.startModalBooting.set(false);
    this.prefetchedMembers.set([]);
  }

  submitStart() {
    const cid = this.selectedId();
    if (!cid) return;
    const members = this.startMembers();
    if (!members.length) {
      this.snack.open('No members on this committee', 'OK');
      return;
    }
    const pool = Number(this.meta()?.monthlyAmount ?? 0);
    const body: Record<string, unknown> = { committeeId: cid };
    if (this.dueDraft) body['dueDate'] = new Date(this.dueDraft).toISOString();
    const ta = this.meta()?.turnAssignment;
    if (ta === 'MANUAL' || ta === 'BIDDING') {
      body['payoutUserId'] = this.startPayoutUserId;
    }
    if (this.useCustomSplits) {
      const splits: { memberId: string; amount: number }[] = [];
      for (const m of members) {
        const amt = parseFloat(this.splitDraft[m.id] || '0');
        if (amt > 0) splits.push({ memberId: m.id, amount: amt });
      }
      if (Math.abs(this.splitSum() - pool) > 0.02) {
        this.snack.open(`Splits must add up to the monthly pool (${pool})`, 'OK');
        return;
      }
      if (splits.length === 0) {
        this.snack.open('Enter positive amounts for the split', 'OK');
        return;
      }
      body['contributionSplits'] = splits;
    }

    if (ta === 'RANDOM') this.spinning.set(true);
    this.starting.set(true);
    this.roundSvc.start(body).subscribe({
      next: () => {
        this.spinning.set(false);
        this.starting.set(false);
        this.closeStart();
        this.snack.open('Round started', 'OK');
        this.loadRounds(cid);
      },
      error: (e) => {
        this.spinning.set(false);
        this.starting.set(false);
        this.snack.open(e?.error?.message || 'Could not start round', 'OK');
      },
    });
  }
}
