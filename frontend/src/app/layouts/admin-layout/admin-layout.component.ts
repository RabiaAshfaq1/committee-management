import { Component, signal, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="flex h-[100dvh] min-h-0 overflow-hidden md:h-screen" [class.dark]="isDark()">
      @if (isMobile() && mobileNavOpen()) {
        <div
          class="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] md:hidden"
          aria-hidden="true"
          (click)="closeMobileNav()"
        ></div>
      }

      <!-- Sidebar: drawer on small screens, docked from md+ -->
      <aside
        id="app-admin-nav"
        class="flex flex-col flex-shrink-0 overflow-y-auto overscroll-contain transition-transform duration-300 ease-out
               fixed left-0 top-0 bottom-0 z-50 w-64 max-w-[85vw] shadow-2xl md:static md:h-full md:z-auto md:max-w-none md:shadow-none md:translate-x-0"
        [class.-translate-x-full]="isMobile() && !mobileNavOpen()"
        [class.translate-x-0]="!isMobile() || mobileNavOpen()"
        [ngClass]="collapsed() ? 'md:w-16' : 'md:w-64'"
        style="background: var(--sidebar-bg);"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 py-4 sm:py-5 border-b border-indigo-800">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style="background: linear-gradient(135deg,#6366F1,#8B5CF6);">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          @if (!collapsed() || isMobile()) {
            <div class="animate-fade-in min-w-0">
              <p class="font-playfair text-white font-bold text-base leading-tight">Amanat</p>
              <p class="text-indigo-300 text-xs leading-snug">Har Committee Ka Bharosa</p>
            </div>
          }
        </div>

        <!-- Nav -->
        <nav class="px-2 py-3 sm:py-4 space-y-1 flex-1">
          @for (item of visibleNav(); track item.route) {
            <a [routerLink]="item.route" routerLinkActive="bg-indigo-600 text-white"
               class="flex items-center gap-3 px-3 py-3 sm:py-2.5 min-h-[44px] rounded-xl text-indigo-200 hover:bg-indigo-800 hover:text-white transition-all duration-200 group touch-manipulation"
               [class.justify-center]="collapsed() && !isMobile()"
               (click)="closeMobileNav()">
              <span class="text-lg flex-shrink-0" [innerHTML]="item.icon"></span>
              @if (!collapsed() || isMobile()) {
                <span class="text-sm font-medium animate-fade-in">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <!-- User info -->
        <div class="mt-auto sticky bottom-0 left-0 right-0 p-3 border-t border-indigo-800 bg-[var(--sidebar-bg)]">
          <div class="flex items-center gap-3" [class.justify-center]="collapsed() && !isMobile()">
            <div class="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                 style="background: linear-gradient(135deg,#6366F1,#8B5CF6);">
              {{ initials() }}
            </div>
            @if (!collapsed() || isMobile()) {
              <div class="flex-1 min-w-0 animate-fade-in">
                <p class="text-white text-xs font-semibold truncate">{{ auth.currentUser?.name }}</p>
                <p class="text-indigo-400 text-xs truncate">{{ auth.currentUser?.role }}</p>
              </div>
              <button type="button" (click)="auth.logout()" title="Logout"
                      class="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center text-indigo-400 hover:text-red-400 transition-colors touch-manipulation">
                <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full" style="background: var(--bg);">
        <!-- Topbar -->
        <header class="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b shadow-sm flex-shrink-0 safe-area-pt"
                style="background: var(--card-bg); border-color: var(--border);">
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              (click)="toggleSidebar()"
              class="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors touch-manipulation"
              [attr.aria-expanded]="isMobile() ? mobileNavOpen() : !collapsed()"
              aria-controls="app-admin-nav"
            >
              <svg class="w-6 h-6 sm:w-5 sm:h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <h1 class="text-slate-700 font-semibold text-sm truncate">Amanat</h1>
          </div>
          <div class="flex items-center gap-1 sm:gap-3 shrink-0">
            <!-- Dark mode toggle -->
            <button type="button" (click)="isDark.set(!isDark())"
                    class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors touch-manipulation">
              @if (isDark()) {
                <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zm6.364 2.803a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM21 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21A.75.75 0 0121 12zm-3.273 5.728a.75.75 0 00-1.06 1.061l1.59 1.591a.75.75 0 101.06-1.06l-1.59-1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5v-2.25A.75.75 0 0112 18zM7.757 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zm.97-5.647a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 6a6 6 0 100 12 6 6 0 000-12z"/>
                </svg>
              } @else {
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
              }
            </button>
            <span class="hidden sm:inline text-sm font-medium text-slate-600 max-w-[10rem] md:max-w-[14rem] truncate">{{ auth.currentUser?.name }}</span>
            <div class="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                 style="background: linear-gradient(135deg,#6366F1,#8B5CF6);">
              {{ initials() }}
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 100dvh; }
  `],
})
export class AdminLayoutComponent {
  private readonly bp = inject(BreakpointObserver);
  private readonly router = inject(Router);

  /** Viewport ≤767px — sidebar becomes off-canvas drawer */
  readonly isMobile = toSignal(
    this.bp.observe('(max-width: 767px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  mobileNavOpen = signal(false);
  collapsed = signal(false);
  isDark = signal(false);

  constructor(public auth: AuthService) {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mobileNavOpen.set(false));
  }

  toggleSidebar(): void {
    if (this.isMobile()) {
      this.mobileNavOpen.update((v) => !v);
    } else {
      this.collapsed.update((v) => !v);
    }
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  initials = computed(() => {
    const name = this.auth.currentUser?.name || '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  });

  private allNav: NavItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/dashboard' },
    { label: 'Committees', icon: '🏦', route: '/committees' },
    { label: 'Members', icon: '👥', route: '/members', roles: ['ADMIN'] },
    { label: 'Rounds', icon: '🔄', route: '/rounds' },
    { label: 'My profile', icon: '⭐', route: '/profile/me', roles: ['MEMBER'] },
  ];

  visibleNav = computed(() => {
    const role = this.auth.currentUser?.role;
    return this.allNav.filter(n => !n.roles || (role && n.roles.includes(role)));
  });
}
