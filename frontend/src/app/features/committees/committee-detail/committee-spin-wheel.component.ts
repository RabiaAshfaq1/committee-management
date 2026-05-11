import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SpinMember {
  id: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-committee-spin-wheel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-4">
      <canvas #cv width="280" height="280" class="max-w-full"></canvas>
      <button type="button" class="btn-primary text-sm px-6 py-2.5 rounded-xl disabled:opacity-50" [disabled]="spinning || !members?.length" (click)="spin()">
        {{ spinning ? 'Spinning…' : 'Spin!' }}
      </button>
      @if (winnerLabel()) {
        <p class="text-sm font-semibold text-indigo-700 text-center">Winner: {{ winnerLabel() }}</p>
      }
      <div class="flex flex-wrap gap-2 justify-center">
        <button type="button" class="btn-secondary text-xs py-1.5 px-3" [disabled]="!pendingOrder.length || spinning" (click)="confirm.emit(pendingOrder)">
          Confirm order
        </button>
        <button type="button" class="btn-secondary text-xs py-1.5 px-3" [disabled]="spinning" (click)="resetWheel()">Re-spin</button>
      </div>
    </div>
  `,
})
export class CommitteeSpinWheelComponent implements OnChanges {
  @Input({ required: true }) members: SpinMember[] = [];
  @ViewChild('cv') cv?: ElementRef<HTMLCanvasElement>;

  /** Emits roster `CommitteeMember.id` values in new turn order (index 0 = turn 1). */
  readonly confirm = output<string[]>();

  spinning = false;
  pendingOrder: string[] = [];
  winnerLabel = () => (this.pendingOrder.length ? this.members.find((m) => m.id === this.pendingOrder[0])?.label || '' : '');

  private rotation = 0;
  private animFrame = 0;

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['members'] && this.members?.length) {
      this.pendingOrder = [];
      setTimeout(() => this.draw(0));
    }
  }

  private palette(i: number, n: number): string {
    const hues = [250, 280, 200, 30, 340, 160];
    return `hsl(${hues[i % hues.length]} 70% ${45 + (i % 3) * 8}%)`;
  }

  draw(angleOffset: number): void {
    const canvas = this.cv?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const n = this.members.length || 1;
    const cx = 140;
    const cy = 140;
    const r = 120;
    ctx.clearRect(0, 0, 280, 280);
    const slice = (2 * Math.PI) / n;
    for (let i = 0; i < n; i++) {
      const start = i * slice + angleOffset;
      const end = start + slice;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = this.members[i]?.color || this.palette(i, n);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(this.members[i]?.label?.slice(0, 14) || '', r - 12, 4);
      ctx.restore();
    }
    // pointer
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx - 10, 36);
    ctx.lineTo(cx + 10, 36);
    ctx.closePath();
    ctx.fill();
  }

  resetWheel(): void {
    cancelAnimationFrame(this.animFrame);
    this.spinning = false;
    this.rotation = 0;
    this.pendingOrder = [];
    this.draw(0);
  }

  spin(): void {
    if (!this.members.length || this.spinning) return;
    this.spinning = true;
    const n = this.members.length;
    const slice = (2 * Math.PI) / n;
    const winnerIndex = Math.floor(Math.random() * n);
    const spins = 5 + Math.random() * 3;
    const targetAngle = spins * 2 * Math.PI + (2 * Math.PI - winnerIndex * slice - slice / 2);
    const start = this.rotation;
    const durationMs = 5200 + Math.random() * 2200;
    const t0 = performance.now();

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const k = ease(t);
      this.rotation = start + targetAngle * k;
      this.draw(this.rotation);
      if (t < 1) {
        this.animFrame = requestAnimationFrame(step);
      } else {
        this.spinning = false;
        const order: string[] = [];
        for (let j = 0; j < n; j++) {
          order.push(this.members[(winnerIndex + j) % n].id);
        }
        this.pendingOrder = order;
        this.fireConfetti();
      }
    };
    this.animFrame = requestAnimationFrame(step);
  }

  private fireConfetti(): void {
    const canvas = this.cv?.nativeElement;
    if (!canvas) return;
    // lightweight burst using canvas overlay — skip heavy libs
    const parent = canvas.parentElement;
    if (!parent) return;
    const burst = document.createElement('div');
    burst.className = 'pointer-events-none absolute inset-0 flex items-center justify-center';
    burst.innerHTML = '<span class="text-4xl animate-bounce">🎉</span>';
    parent.style.position = 'relative';
    parent.appendChild(burst);
    setTimeout(() => burst.remove(), 1800);
  }
}
