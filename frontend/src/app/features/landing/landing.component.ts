import { AfterViewInit, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { environment } from '../../../environments/environment';

/** Shown if API is down — aligned with live badge names & copy */
export const LANDING_BADGE_FALLBACK: LandingBadge[] = [
  {
    name: 'Amanatdaar',
    description: 'Paid on time in 5+ consecutive rounds.',
    condition: 'Earned after 5+ consecutive on-time payments',
    color: '#10B981',
    icon: 'shield',
    variant: 'positive',
  },
  {
    name: 'Wafadaar Saathi',
    description: 'Successfully completed 3+ committees.',
    condition: 'Earned after completing three or more committees',
    color: '#3B82F6',
    icon: 'star',
    variant: 'positive',
  },
  {
    name: 'Naya Rukn',
    description: 'Joined the first committee.',
    condition: 'Earned when you join your first committee',
    color: '#94A3B8',
    icon: 'user',
    variant: 'neutral',
  },
  {
    name: 'Bharosemand',
    description: 'Maintained a perfect payment history.',
    condition: 'Earned when every recorded payment is paid on time',
    color: '#F59E0B',
    icon: 'medal',
    variant: 'gold',
  },
  {
    name: 'Sargaram',
    description: 'Active in 3+ committees simultaneously.',
    condition: 'Earned while participating in three or more active committees',
    color: '#F97316',
    icon: 'fire',
    variant: 'positive',
  },
  {
    name: 'Tawajju Darkaar',
    description: 'Multiple payments overdue.',
    condition: 'Shown when two or more payments are overdue',
    color: '#EF4444',
    icon: 'warning',
    variant: 'warning',
  },
];

export interface LandingBadge {
  name: string;
  description: string;
  condition: string;
  color: string;
  icon: 'shield' | 'star' | 'user' | 'medal' | 'fire' | 'warning' | string;
  variant: 'positive' | 'neutral' | 'gold' | 'warning';
}

/** Maps Prisma seed slugs to user-facing copy (Badge.condition is a machine key). */
const BADGE_CONDITION_HELP: Record<string, string> = {
  consecutive_paid_5: 'Earned after 5+ consecutive on-time payments',
  committees_completed_3: 'Earned after completing three or more committees',
  first_committee: 'Earned when you join your first committee',
  payment_rate_100: 'Earned when every recorded payment is paid on time',
  active_committees_3: 'Earned while active in three or more committees at once',
  missed_payments_2: 'Shown when two or more payments are overdue',
};

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit {
  private readonly http = inject(HttpClient);

  readonly badges = signal<LandingBadge[]>([]);
  readonly year = new Date().getFullYear();
  readonly mobileNavOpen = signal(false);

  readonly steps = [
    {
      n: 1,
      title: 'Sign up',
      body: 'Create your account as an admin (organizer) or a member.',
    },
    {
      n: 2,
      title: 'Create or join a committee',
      body: 'Admins set slots and turn order; members see the committees they belong to.',
    },
    {
      n: 3,
      title: 'Wait for your turn — safely',
      body: 'Manual, spin, or bidding — record payment proof in the app while funds move offline.',
    },
  ];

  readonly features = [
    {
      title: 'Transparent history',
      text: 'Every committee’s activity, rounds, and status on a clear timeline.',
    },
    {
      title: 'Badge-based trust',
      text: 'Amanatdaar, Bharosemand, Tawajju Darkaar, and more — badges reflect real behaviour, not claims.',
    },
    {
      title: 'Flexible slots',
      text: 'Two or three people can share one slot with split contributions and proportional payouts.',
    },
    {
      title: 'Simple payment proof',
      text: 'Members submit a transaction ID; admins confirm — straightforward and paperless.',
    },
  ];

  readonly testimonials = [
    {
      quote: 'We used to rely on WhatsApp threads — now everything is on record and much calmer.',
      name: 'Fatima Zahra',
      city: 'Lahore',
    },
    {
      quote: 'Before adding someone, I check their trust profile. It has changed how we onboard people.',
      name: 'Hassan Ali',
      city: 'Karachi',
    },
    {
      quote: 'Badges gave the group a healthy nudge — late payments dropped almost immediately.',
      name: 'Ayesha Siddiqui',
      city: 'Islamabad',
    },
  ];

  ngOnInit(): void {
    this.http.get<{ data?: { name: string; description: string; color: string; icon: string; condition?: string }[] }>(`${environment.apiUrl}/badges`).subscribe({
      next: (res) => {
        const rows = res.data ?? [];
        if (!rows.length) {
          this.badges.set(LANDING_BADGE_FALLBACK);
          return;
        }
        const mapped: LandingBadge[] = rows.map((r) => {
          const key = r.condition ?? '';
          const conditionText =
            key && BADGE_CONDITION_HELP[key] ? BADGE_CONDITION_HELP[key] : r.description;
          return {
            name: r.name,
            description: r.description,
            condition: conditionText,
            color: r.color,
            icon: this.normalizeIcon(r.icon),
            variant: this.variantForBadge(r.name),
          };
        });
        this.badges.set(mapped);
      },
      error: () => this.badges.set(LANDING_BADGE_FALLBACK),
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      AOS.init({
        duration: 800,
        once: true,
        offset: 56,
        easing: 'ease-out-quart',
      });
      AOS.refresh();
    });
  }

  displayBadges(): LandingBadge[] {
    const b = this.badges();
    return b.length ? b : LANDING_BADGE_FALLBACK;
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  badgeTint(hex: string): string {
    return `linear-gradient(145deg, ${hex}, ${this.darkenHex(hex, 10)})`;
  }

  private normalizeIcon(icon: string): LandingBadge['icon'] {
    const i = (icon || '').toLowerCase();
    if (i.includes('shield')) return 'shield';
    if (i.includes('star')) return 'star';
    if (i.includes('user')) return 'user';
    if (i.includes('medal')) return 'medal';
    if (i.includes('fire')) return 'fire';
    if (i.includes('warn')) return 'warning';
    return 'star';
  }

  private variantForBadge(name: string): LandingBadge['variant'] {
    if (name === 'Tawajju Darkaar') return 'warning';
    if (name === 'Bharosemand') return 'gold';
    if (name === 'Naya Rukn') return 'neutral';
    return 'positive';
  }

  private darkenHex(hex: string, amount: number): string {
    const n = hex.replace('#', '');
    if (n.length !== 6) return hex;
    const r = Math.max(0, parseInt(n.slice(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(n.slice(2, 4), 16) - amount);
    const b = Math.max(0, parseInt(n.slice(4, 6), 16) - amount);
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  }
}
