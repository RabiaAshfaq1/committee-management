import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RoundService } from '../../core/services/round.service';
import { CommitteeService } from '../../core/services/committee.service';
import { AuthService } from '../../core/services/auth.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-rounds',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-5 sm:space-y-6 animate-fade-in px-2 sm:px-3">
      <div class="text-center px-1">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800">Rounds</h1>
        <p class="text-slate-500 text-xs sm:text-sm mt-2 leading-relaxed text-pretty">
          Members pay the admin each round and submit a <strong>transaction ID</strong>. The round winner records proof of receiving the payout. Money moves outside the app.
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
          <a [routerLink]="['/committees', selectedId()]" class="btn-secondary text-xs py-2.5 sm:py-2 px-3 text-center whitespace-nowrap w-full sm:w-auto touch-manipulation">Committee detail</a>
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
        @if (canManageSelectedCommittee() && meta()?.membersReady && !hasActive()) {
          <div class="flex justify-center">
            <button type="button" (click)="openStart()" class="btn-primary text-sm px-6 py-3 sm:py-2.5 rounded-xl w-full max-w-xs touch-manipulation">+ New round</button>
          </div>
        }

        <div class="space-y-4">
          @for (r of rounds(); track r.id) {
            <div
              class="glass-card p-5 border border-slate-100"
              [ngClass]="{
                'ring-2 ring-indigo-200': r.status === 'ACTIVE',
                'ring-2 ring-emerald-300': r.status === 'COMPLETED' && isPayoutWinner(r)
              }"
            >
              <div class="flex flex-wrap justify-between gap-2">
                <div>
                  <span class="text-xs font-semibold text-slate-400">ROUND {{ r.roundNumber }}</span>
                  <p class="font-bold text-slate-800">Pool: <span class="font-mono text-indigo-600">₨{{ poolAmount(r) | number:'1.0-0' }}</span></p>
                  <p class="text-sm text-slate-600 mt-1">
                    Recipient:
                    <strong [class.text-emerald-600]="isPayoutWinner(r)" [class.font-extrabold]="isPayoutWinner(r)">{{ payoutName(r) }}</strong>
                    @if (isPayoutWinner(r)) { <span class="ml-1 text-xs font-semibold text-emerald-600">(You)</span> }
                  </p>
                  @if (r.recipientTransactionId) {
                    <p class="text-xs text-emerald-700 mt-2 font-mono bg-emerald-50 inline-block px-2 py-1 rounded">Payout tx: {{ r.recipientTransactionId }}</p>
                  }
                </div>
                <span class="badge" [ngClass]="r.status==='COMPLETED'?'badge-success':r.status==='ACTIVE'?'badge-info':'badge-muted'">{{ r.status }}</span>
              </div>

              @if (r.payments?.length) {
                <div class="mt-3 text-xs text-slate-500">
                  <span class="font-semibold text-slate-600">Member payments:</span>
                  @for (p of r.payments; track p.id) {
                    <span class="inline-block mr-2 mt-1">{{ p.user?.name }}: {{ p.status }} · ₨{{ p.amount | number:'1.0-0' }}</span>
                  }
                </div>
              }

              @if (r.status === 'ACTIVE') {
                <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  @if (canSubmitRecipientTx(r)) {
                    <input [(ngModel)]="txDraft[r.id]" placeholder="Payout transaction ID (proof)"
                           class="w-full sm:flex-1 min-w-0 px-3 py-3 sm:py-2 rounded-lg border text-sm font-mono"/>
                    <button type="button" class="btn-primary text-xs py-3 sm:py-2 px-4 w-full sm:w-auto touch-manipulation" (click)="saveTx(r)" [disabled]="txBusy()===r.id">Save</button>
                  }
                  @if (canManageSelectedCommittee()) {
                    <button type="button" class="btn-secondary text-xs py-3 sm:py-2 px-4 w-full sm:w-auto touch-manipulation" (click)="complete(r)" [disabled]="busyId()===r.id">Complete round</button>
                  }
                </div>
              }
            </div>
          }
          @if (!rounds().length) {
            <p class="text-center text-slate-500 py-8">No rounds yet. The admin can start one with “New round” when all slots are filled.</p>
          }
        </div>
      }

      @if (canManageSelectedCommittee() && selectedId() && hasCompletedRound()) {
        <div class="glass-card p-5 rounded-2xl border border-indigo-100 mt-4">
          <h3 class="text-sm font-bold text-slate-800 mb-1">Post-round feedback</h3>
          <p class="text-xs text-slate-500 mb-3">After a round completes, leave a quick rating for a member in this committee.</p>
          <div class="flex flex-col sm:flex-row gap-2 sm:items-end">
            <select [(ngModel)]="fbToUserId" class="flex-1 px-3 py-2 rounded-xl border text-sm bg-white">
              @for (m of rosterMembers(); track m.id) {
                <option [value]="m.userId">{{ m.user?.name }}</option>
              }
            </select>
            <div class="flex gap-1 items-center justify-center sm:justify-start py-1">
              @for (n of [1,2,3,4,5]; track n) {
                <button type="button" class="min-h-[44px] min-w-[44px] flex items-center justify-center text-xl leading-none touch-manipulation" [class.opacity-30]="fbRating < n" (click)="fbRating = n" [attr.aria-label]="'Rating ' + n">★</button>
              }
            </div>
            <input [(ngModel)]="fbComment" placeholder="Comment (optional)" class="flex-1 min-w-0 px-3 py-2 rounded-xl border text-sm" />
            <button type="button" class="btn-primary text-xs py-2 px-4 shrink-0" [disabled]="fbBusy()" (click)="submitRoundFeedback()">{{ fbBusy() ? '…' : 'Submit' }}</button>
          </div>
        </div>
      }

      @if (showStart()) {
        <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" (click)="closeStart()">
          <div class="glass-card p-5 sm:p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl" style="background:white" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-slate-800 mb-2">Start round</h2>
            <p class="text-xs text-slate-500 mb-4">
              Turn method: <strong>{{ meta()?.turnMethod }}</strong>.
              For <strong>MANUAL</strong> or <strong>BIDDING</strong>, pick the payout recipient below. For <strong>SPIN</strong>, the server picks randomly.
            </p>
            @if (startModalBooting()) {
              <div class="h-32 skeleton rounded-xl mb-4"></div>
            } @else {
              @if (meta()?.turnMethod !== 'SPIN') {
                <label class="block text-sm font-medium mb-1">Recipient</label>
                <select [(ngModel)]="startPayoutUserId" class="w-full mb-3 px-3 py-2 rounded-xl border text-sm">
                  @for (m of startMembers(); track m.id) {
                    <option [value]="m.userId">{{ m.user?.name }}</option>
                  }
                </select>
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
  meta = signal<{
    membersReady: boolean;
    monthlyAmount: number;
    turnMethod: string;
    totalSlots: number;
  } | null>(null);
  showStart = signal(false);
  startModalBooting = signal(false);
  prefetchedMembers = signal<any[]>([]);
  dueDraft = '';
  startPayoutUserId = '';
  spinning = signal(false);
  txDraft: Record<string, string> = {};
  fbToUserId = '';
  fbRating = 5;
  fbComment = '';
  fbBusy = signal(false);

  constructor(
    private roundSvc: RoundService,
    private committeeSvc: CommitteeService,
    public auth: AuthService,
    private snack: MatSnackBar,
    private feedback: FeedbackService,
    private toast: ToastrService,
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

  poolAmount(r: any): number {
    return r.committee?.monthlyAmount ?? this.meta()?.monthlyAmount ?? 0;
  }

  startMembers(): any[] {
    const p = this.prefetchedMembers();
    if (p.length) return p;
    return this.rounds()[0]?.committee?.members ?? [];
  }

  isMyCommittee(): boolean {
    const c = this.committees().find((x) => x.id === this.selectedId());
    return c?.adminId === this.auth.currentUser?.id;
  }

  canManageSelectedCommittee(): boolean {
    return this.isMyCommittee() || this.auth.isAdmin;
  }

  isPayoutWinner(r: any): boolean {
    return !!r?.payoutUserId && r.payoutUserId === this.auth.currentUser?.id;
  }

  hasCompletedRound(): boolean {
    return !!this.rounds().some((r) => r.status === 'COMPLETED');
  }

  lastCompletedRoundId(): string | null {
    const completed = this.rounds()
      .filter((r) => r.status === 'COMPLETED')
      .sort((a, b) => b.roundNumber - a.roundNumber);
    return completed[0]?.id ?? null;
  }

  rosterMembers(): any[] {
    const first = this.rounds()[0];
    return first?.committee?.members ?? [];
  }

  submitRoundFeedback(): void {
    const cid = this.selectedId();
    const roundId = this.lastCompletedRoundId();
    if (!cid || !this.fbToUserId || !roundId) {
      this.toast.warning('Choose a member and ensure a round has completed');
      return;
    }
    this.fbBusy.set(true);
    this.feedback
      .create({
        toUserId: this.fbToUserId,
        committeeId: cid,
        roundId,
        rating: this.fbRating,
        comment: this.fbComment.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Feedback saved');
          this.snack.open('Feedback saved', 'OK');
          this.fbBusy.set(false);
          this.fbComment = '';
        },
        error: (e) => {
          this.fbBusy.set(false);
          this.toast.error(e?.error?.message || 'Could not save');
        },
      });
  }

  hasActive(): boolean {
    return !!this.rounds().find((r) => r.status === 'ACTIVE');
  }

  onCommitteeChange(id: string) {
    this.selectedId.set(id || '');
    if (!id) return;
    const c = this.committees().find((x) => x.id === id);
    const slotsFilled = c?.slotsFilled ?? c?._count?.members ?? 0;
    const tot = c?.totalSlots ?? 0;
    this.meta.set({
      membersReady: tot > 0 && slotsFilled >= tot,
      monthlyAmount: c?.monthlyAmount ?? 0,
      turnMethod: c?.turnMethod ?? 'SPIN',
      totalSlots: tot,
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
          const cm = first.committee.members ?? [];
          const slotsFilled = cm.reduce((s: number, m: any) => s + (m.shareCount ?? 1), 0);
          const totMem = first.committee.totalSlots ?? 0;
          this.meta.set({
            membersReady: totMem > 0 && slotsFilled >= totMem,
            monthlyAmount: first.committee.monthlyAmount,
            turnMethod: first.committee.turnMethod ?? 'SPIN',
            totalSlots: totMem,
          });
        }
        const mem = first?.committee?.members ?? [];
        if (mem.length && !this.startPayoutUserId) this.startPayoutUserId = mem[0].userId;
        if (mem.length && !this.fbToUserId) this.fbToUserId = mem[0].userId;
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

  canSubmitRecipientTx(r: any): boolean {
    if (r.status !== 'ACTIVE') return false;
    if (r.payoutUserId === this.auth.currentUser?.id) return true;
    return this.canManageSelectedCommittee();
  }

  saveTx(r: any) {
    const tid = (this.txDraft[r.id] || '').trim();
    if (!tid) return;
    this.txBusy.set(r.id);
    this.roundSvc.submitRecipientTx(r.id, tid).subscribe({
      next: () => {
        this.snack.open('Payout transaction ID saved', 'OK');
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

  private applyOpenStartWithMembers(members: any[]) {
    this.startPayoutUserId = members[0]?.userId || '';
    this.startModalBooting.set(false);
    this.showStart.set(true);
  }

  openStart() {
    this.dueDraft = '';
    this.prefetchedMembers.set([]);
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
    const body: Record<string, unknown> = {};
    if (this.dueDraft) body['dueDate'] = new Date(this.dueDraft).toISOString();
    const tm = this.meta()?.turnMethod ?? 'SPIN';
    if (tm === 'MANUAL' || tm === 'BIDDING') {
      body['payoutUserId'] = this.startPayoutUserId;
    }

    if (tm === 'SPIN') this.spinning.set(true);
    this.starting.set(true);
    this.roundSvc.startRound(cid, body).subscribe({
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
