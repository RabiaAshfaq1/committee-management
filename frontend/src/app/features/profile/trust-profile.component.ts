import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { MemberService } from '../../core/services/member.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { RoundService } from '../../core/services/round.service';
import { AuthService } from '../../core/services/auth.service';

const BADGE_ICON: Record<string, string> = {
  Amanatdaar: '🛡️',
  'Wafadaar Saathi': '⭐',
  'Naya Rukn': '👤',
  Bharosemand: '🏅',
  Sargaram: '🔥',
  'Tawajju Darkaar': '⚠️',
};

@Component({
  selector: 'app-trust-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-10 pb-16 animate-fade-in px-2">
      @if (loading()) {
        <div class="glass-card h-96 skeleton rounded-2xl"></div>
      } @else if (error()) {
        <div class="glass-card p-12 text-center rounded-2xl">
          <p class="text-slate-600">{{ error() }}</p>
          <a routerLink="/dashboard" class="btn-primary inline-block mt-4 text-sm">Back to dashboard</a>
        </div>
      } @else {
        @if (payload()) {
        @if (isSelf()) {
          <div
            class="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 text-sm text-indigo-900 flex flex-wrap items-center justify-between gap-2"
          >
            <span class="font-medium">This is your profile — others see the same trust view when you build history.</span>
            <button type="button" class="btn-secondary text-xs py-1.5 px-3" (click)="openEditSelf()">Edit name / phone</button>
          </div>
        }

        <!-- Hero -->
        <section class="glass-card p-6 md:p-10 rounded-2xl shadow-xl border border-white/60">
          <div class="flex flex-col md:flex-row gap-8 items-center">
            <div
              class="w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold text-white shadow-lg shrink-0"
              style="background: linear-gradient(135deg, #6366f1 0%, #7c74f2 45%, #8b7fd9 100%)"
            >
              {{ initials(payload()!.user?.name) }}
            </div>
            <div class="flex-1 text-center md:text-left space-y-1 min-w-0">
              <h1 class="text-2xl md:text-3xl font-bold text-slate-800 truncate">{{ payload()!.user?.name }}</h1>
              <p class="text-slate-500 text-sm">{{ payload()!.user?.email }}</p>
              @if (payload()!.user?.phone) {
                <p class="text-slate-500 text-sm">{{ payload()!.user?.phone }}</p>
              }
              <p class="text-xs text-slate-400">Member since {{ payload()!.user?.createdAt | date: 'mediumDate' }}</p>
            </div>
            <div class="flex flex-col items-center gap-2 shrink-0">
              <div class="relative w-36 h-36">
                <svg class="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#e2e8f0" stroke-width="10" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    [attr.stroke]="trustColor(payload()!.trustScore?.score)"
                    stroke-width="10"
                    fill="none"
                    stroke-linecap="round"
                    [style.stroke-dasharray]="264"
                    [style.stroke-dashoffset]="264 - (264 * (payload()!.trustScore?.score ?? 0)) / 100"
                    class="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="text-2xl font-bold text-slate-800">{{ payload()!.trustScore?.score ?? 0 }}</span>
                  <span class="text-[10px] uppercase tracking-wide font-semibold" [style.color]="trustColor(payload()!.trustScore?.score)">{{
                    trustLabel(payload()!.trustScore?.score)
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            @for (s of statCards(payload()!); track s.k) {
              <div class="rounded-xl border border-slate-100 bg-white/70 backdrop-blur-sm p-4 text-center shadow-sm">
                <p class="text-lg font-bold text-slate-800">{{ s.v }}</p>
                <p class="text-[11px] text-slate-500 mt-1">{{ s.k }}</p>
              </div>
            }
          </div>
        </section>

        <!-- Badges -->
        <section>
          <h2 class="text-lg font-bold text-slate-800 tracking-tight mb-1">Earned badges</h2>
          <p class="text-xs text-slate-500 mb-5 max-w-2xl">Recognition from real payment and committee history — not self-claims.</p>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            @for (b of mergedBadges(); track b.name) {
              <div
                class="amanat-badge-card group rounded-2xl border px-5 pt-6 pb-5 flex flex-col items-stretch min-h-[9.5rem] transition-all duration-300 ease-out"
                [class.opacity-70]="!b.earned"
                [class.grayscale]="!b.earned"
                [class.amanat-badge-card--earned]="b.earned"
                [class.amanat-badge-card--warn]="b.earned && b.name === 'Tawajju Darkaar'"
                [class.amanat-badge-card--gold]="b.earned && b.name === 'Bharosemand'"
              >
                <div class="flex flex-col items-center text-center gap-3 flex-1">
                  <div
                    class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md transition-transform duration-300 group-hover:scale-105 amanat-badge-icon"
                    [style.background]="b.earned ? 'linear-gradient(145deg, ' + (b.color || '#6366f1') + ', rgba(255,255,255,0.15))' : 'linear-gradient(145deg, #e2e8f0, #f1f5f9)'"
                    [class.amanat-badge-icon--earned]="b.earned"
                  >
                    <span class="leading-none">{{ b.earned ? (BADGE_ICON[b.name] || '✨') : '🔒' }}</span>
                  </div>
                  <div class="space-y-1.5 w-full">
                    <p class="font-semibold text-slate-800 text-sm leading-snug tracking-tight">{{ b.name }}</p>
                    <p class="text-xs text-slate-500 leading-relaxed">{{ b.description }}</p>
                  </div>
                </div>
                @if (!b.earned) {
                  <p class="text-[11px] font-medium text-indigo-600/90 mt-4 text-center">Keep going!</p>
                }
              </div>
            }
          </div>
        </section>

        <!-- Committee history -->
        <section>
          <h2 class="text-lg font-bold text-slate-800 mb-4">Committee history</h2>
          @if (!(payload()!.committeeHistory || []).length) {
            <div class="glass-card p-10 text-center rounded-2xl text-slate-500 text-sm">No committees yet.</div>
          } @else {
            <ul class="space-y-4">
              @for (h of payload()!.committeeHistory; track h.committeeId) {
                <li class="glass-card p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-slate-800">{{ h.name }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ h.startDate | date: 'mediumDate' }} · {{ h.roundsCount }} rounds</p>
                    <div class="mt-3 max-w-md">
                      <div class="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Payment rate</span>
                        <span>{{ h.paidCount }}/{{ h.totalPayments }} ({{ h.paymentRatePct }}%)</span>
                      </div>
                      <div class="progress-bar h-2">
                        <div class="progress-fill" [style.width.%]="h.paymentRatePct"></div>
                      </div>
                    </div>
                  </div>
                  <span
                    class="badge self-start"
                    [ngClass]="
                      h.committeeStatus === 'COMPLETED'
                        ? 'badge-muted'
                        : h.committeeStatus === 'ACTIVE'
                          ? 'badge-success'
                          : 'badge-warning'
                    "
                    >{{ h.statusLabel }}</span
                  >
                </li>
              }
            </ul>
          }
        </section>

        <!-- Feedback -->
        <section>
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 class="text-lg font-bold text-slate-800">What others say</h2>
            @if (showLeaveFeedback()) {
              <button type="button" class="btn-primary text-xs py-2 px-4" (click)="openFeedbackModal()">Leave feedback</button>
            }
          </div>
          @if (!(payload()!.feedbackReceived || []).length) {
            <div class="glass-card p-12 text-center rounded-2xl border border-dashed border-slate-200">
              <p class="text-4xl mb-2">💬</p>
              <p class="text-slate-500 text-sm">No feedback yet — when admins share ratings, they show up here.</p>
            </div>
          } @else {
            <div class="grid md:grid-cols-2 gap-4">
              @for (f of payload()!.feedbackReceived; track f.createdAt + f.fromUserName) {
                <div class="glass-card p-5 rounded-2xl border border-slate-100">
                  <p class="text-amber-500 text-sm mb-1">{{ stars(f.rating) }}</p>
                  <p class="text-slate-700 text-sm">{{ f.comment || '—' }}</p>
                  <p class="text-xs text-slate-400 mt-3">
                    From <span class="font-medium text-slate-600">{{ f.fromUserName }}</span> · {{ f.createdAt | date: 'mediumDate' }}
                    @if (f.committeeName) {
                      <span> · {{ f.committeeName }}</span>
                    }
                  </p>
                </div>
              }
            </div>
          }
        </section>
        }
      }

      @if (showFbModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="closeFbModal()">
          <div class="glass-card p-6 w-full max-w-md rounded-2xl bg-white shadow-2xl" (click)="$event.stopPropagation()">
            <h3 class="font-bold text-slate-800 mb-4">Leave feedback</h3>
            <div class="space-y-3 text-sm">
              <div>
                <label class="block text-slate-600 mb-1">Committee</label>
                <select
                  [(ngModel)]="fbCommitteeId"
                  (ngModelChange)="onFbCommitteeChange($event)"
                  class="w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  @for (c of fbCommitteeOptions(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-slate-600 mb-1">Completed round</label>
                <select [(ngModel)]="fbRoundId" class="w-full rounded-xl border border-slate-200 px-3 py-2">
                  @for (r of fbRounds(); track r.id) {
                    <option [value]="r.id">Round {{ r.roundNumber }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-slate-600 mb-1">Rating</label>
                <div class="flex gap-1">
                  @for (n of [1, 2, 3, 4, 5]; track n) {
                    <button
                      type="button"
                      class="text-2xl leading-none"
                      [class.opacity-30]="fbRating < n"
                      (click)="fbRating = n"
                    >
                      ★
                    </button>
                  }
                </div>
              </div>
              <div>
                <label class="block text-slate-600 mb-1">Comment (optional)</label>
                <textarea [(ngModel)]="fbComment" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2"></textarea>
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <button type="button" class="flex-1 btn-secondary" (click)="closeFbModal()">Cancel</button>
              <button type="button" class="flex-1 btn-primary" [disabled]="fbSaving()" (click)="submitFeedback()">
                {{ fbSaving() ? 'Saving…' : 'Submit' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (showEditModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" (click)="showEditModal.set(false)">
          <div class="glass-card p-6 w-full max-w-md rounded-2xl bg-white" (click)="$event.stopPropagation()">
            <h3 class="font-bold text-slate-800 mb-4">Edit profile</h3>
            <div class="space-y-3">
              <div>
                <label class="text-xs text-slate-500">Name</label>
                <input [(ngModel)]="editName" class="w-full rounded-xl border px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="text-xs text-slate-500">Phone</label>
                <input [(ngModel)]="editPhone" class="w-full rounded-xl border px-3 py-2 text-sm" />
              </div>
            </div>
            <div class="flex gap-2 mt-4">
              <button type="button" class="flex-1 btn-secondary" (click)="showEditModal.set(false)">Cancel</button>
              <button type="button" class="flex-1 btn-primary" [disabled]="editSaving()" (click)="saveSelf()">{{ editSaving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .amanat-badge-card {
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border-color: rgba(226, 232, 240, 0.95);
        box-shadow: 0 4px 22px rgba(15, 23, 42, 0.05);
      }
      .amanat-badge-card--earned {
        background: rgba(255, 255, 255, 0.93);
        border-color: rgba(199, 210, 254, 0.75);
        box-shadow: 0 6px 28px rgba(79, 70, 229, 0.07);
      }
      .amanat-badge-card--earned:hover {
        box-shadow: 0 12px 36px rgba(79, 70, 229, 0.1);
        transform: translateY(-2px);
      }
      .amanat-badge-card--gold.amanat-badge-card--earned {
        border-color: rgba(251, 191, 36, 0.32);
        box-shadow: 0 8px 30px rgba(245, 158, 11, 0.08);
      }
      .amanat-badge-card--warn.amanat-badge-card--earned {
        border-color: rgba(252, 165, 165, 0.45);
        box-shadow: 0 8px 28px rgba(239, 68, 68, 0.07);
      }
      .amanat-badge-icon--earned {
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.38), 0 4px 14px rgba(15, 23, 42, 0.08);
      }
    `,
  ],
})
export class TrustProfileComponent implements OnInit, OnDestroy {
  readonly BADGE_ICON = BADGE_ICON;
  loading = signal(true);
  error = signal('');
  payload = signal<any>(null);
  private resolvedUserId = signal<string>('');
  private sub?: Subscription;

  isSelf = computed(() => this.auth.currentUser?.id === this.resolvedUserId());
  showLeaveFeedback = computed(() => {
    if (this.isSelf() || !this.auth.isLoggedIn) return false;
    return true;
  });

  mergedBadges = computed(() => {
    const p = this.payload();
    const earned = new Map((p?.badges || []).map((ub: any) => [ub.name, ub]));
    const all = p?.allBadges || [];
    return all.map((b: any) => ({
      name: b.name,
      description: b.description,
      color: b.color,
      earned: earned.has(b.name),
    }));
  });

  showFbModal = signal(false);
  fbCommitteeId = '';
  fbRoundId = '';
  fbRating = 5;
  fbComment = '';
  fbSaving = signal(false);
  fbCommitteeOptions = signal<{ id: string; name: string }[]>([]);
  fbRounds = signal<{ id: string; roundNumber: number }[]>([]);

  showEditModal = signal(false);
  editName = '';
  editPhone = '';
  editSaving = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private members: MemberService,
    private feedback: FeedbackService,
    private rounds: RoundService,
    public auth: AuthService,
    private toast: ToastrService,
  ) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((pm) => {
      const raw = pm.get('id') || '';
      const id = raw === 'me' ? this.auth.currentUser?.id || '' : raw;
      if (!id) {
        this.error.set('Not signed in.');
        this.loading.set(false);
        return;
      }
      if (raw === 'me' && this.auth.currentUser?.role === 'MEMBER' && !this.auth.currentUser?.id) {
        this.router.navigate(['/auth/login']);
        return;
      }
      this.resolvedUserId.set(id);
      this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.members.getTrustProfile(id).subscribe({
      next: (res) => {
        this.payload.set(res.data);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message || 'Could not load profile');
      },
    });
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

  trustColor(score?: number): string {
    const s = score ?? 0;
    if (s >= 80) return '#10b981';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  }

  trustLabel(score?: number): string {
    const s = score ?? 0;
    if (s >= 80) return 'Zabardast';
    if (s >= 50) return 'Theek hai';
    return 'Ehtiyat';
  }

  statCards(p: any): { k: string; v: string }[] {
    const st = p.stats || {};
    return [
      { k: 'Total committees', v: String(st.totalCommitteesJoined ?? 0) },
      { k: 'Completed', v: String(st.committeesCompleted ?? 0) },
      { k: 'Payment rate', v: `${st.paymentSuccessRate ?? 0}%` },
      { k: 'Avg rating', v: st.averageRating != null ? Number(st.averageRating).toFixed(1) : '—' },
    ];
  }

  stars(n: number): string {
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  openFeedbackModal(): void {
    const hist = this.payload()?.committeeHistory || [];
    const opts = hist.map((h: any) => ({ id: h.committeeId, name: h.name }));
    if (!opts.length) {
      this.toast.warning('No committee history on this profile yet — feedback links to a completed round.');
      return;
    }
    this.fbCommitteeOptions.set(opts);
    this.fbCommitteeId = opts[0]?.id || '';
    this.fbRoundId = '';
    this.fbRounds.set([]);
    this.fbRating = 5;
    this.fbComment = '';
    if (this.fbCommitteeId) this.onFbCommitteeChange(this.fbCommitteeId);
    this.showFbModal.set(true);
  }

  onFbCommitteeChange(cid: string): void {
    if (!cid) {
      this.fbRounds.set([]);
      this.fbRoundId = '';
      return;
    }
    this.rounds.getByCommittee(cid).subscribe({
      next: (res) => {
        const list = (res.data || [])
          .filter((r: any) => r.status === 'COMPLETED')
          .sort((a: any, b: any) => b.roundNumber - a.roundNumber)
          .map((r: any) => ({ id: r.id, roundNumber: r.roundNumber }));
        this.fbRounds.set(list);
        this.fbRoundId = list[0]?.id || '';
      },
      error: () => this.toast.error('Could not load rounds for this committee'),
    });
  }

  closeFbModal(): void {
    this.showFbModal.set(false);
  }

  submitFeedback(): void {
    const uid = this.resolvedUserId();
    const cid = this.fbCommitteeId;
    const rid = this.fbRoundId;
    if (!cid || !uid || !rid) {
      this.toast.warning('Pick a committee and a completed round');
      return;
    }
    this.fbSaving.set(true);
    this.feedback
      .create({
        toUserId: uid,
        committeeId: cid,
        roundId: rid,
        rating: this.fbRating,
        comment: this.fbComment.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Feedback saved');
          this.fbSaving.set(false);
          this.closeFbModal();
          this.load(uid);
        },
        error: (e) => {
          this.fbSaving.set(false);
          this.toast.error(e?.error?.message || 'Could not save');
        },
      });
  }

  openEditSelf(): void {
    const p = this.payload();
    this.editName = p?.user?.name || '';
    this.editPhone = p?.user?.phone || '';
    this.showEditModal.set(true);
  }

  saveSelf(): void {
    const id = this.auth.currentUser?.id;
    if (!id) return;
    this.editSaving.set(true);
    this.members.update(id, { name: this.editName, phone: this.editPhone }).subscribe({
      next: () => {
        this.toast.success('Profile updated');
        this.editSaving.set(false);
        this.showEditModal.set(false);
        this.load(id);
      },
      error: (e) => {
        this.editSaving.set(false);
        this.toast.error(e?.error?.message || 'Update failed');
      },
    });
  }
}
