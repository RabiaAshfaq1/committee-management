import { Component, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
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
    <div class="flex h-screen overflow-hidden" [class.dark]="isDark()">
      <!-- Sidebar -->
      <aside class="flex-shrink-0 transition-all duration-300 ease-in-out"
             [class.w-64]="!collapsed()"
             [class.w-16]="collapsed()"
             style="background: var(--sidebar-bg);">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 py-5 border-b border-indigo-800">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style="background: linear-gradient(135deg,#6366F1,#8B5CF6);">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          @if (!collapsed()) {
            <div class="animate-fade-in">
              <p class="text-white font-bold text-sm leading-tight">CommitteeMS</p>
              <p class="text-indigo-300 text-xs">Rotating Savings</p>
            </div>
          }
        </div>

        <!-- Nav -->
        <nav class="px-2 py-4 space-y-1">
          @for (item of visibleNav(); track item.route) {
            <a [routerLink]="item.route" routerLinkActive="bg-indigo-600 text-white"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-200 hover:bg-indigo-800 hover:text-white transition-all duration-200 group"
               [class.justify-center]="collapsed()">
              <span class="text-lg flex-shrink-0" [innerHTML]="item.icon"></span>
              @if (!collapsed()) {
                <span class="text-sm font-medium animate-fade-in">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <!-- User info -->
        <div class="absolute bottom-0 left-0 right-0 p-3 border-t border-indigo-800">
          <div class="flex items-center gap-3" [class.justify-center]="collapsed()">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                 style="background: linear-gradient(135deg,#6366F1,#8B5CF6);">
              {{ initials() }}
            </div>
            @if (!collapsed()) {
              <div class="flex-1 min-w-0 animate-fade-in">
                <p class="text-white text-xs font-semibold truncate">{{ auth.currentUser?.name }}</p>
                <p class="text-indigo-400 text-xs truncate">{{ auth.currentUser?.role }}</p>
              </div>
              <button (click)="auth.logout()" title="Logout"
                      class="text-indigo-400 hover:text-red-400 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden" style="background: var(--bg);">
        <!-- Topbar -->
        <header class="flex items-center justify-between px-6 py-3 border-b shadow-sm flex-shrink-0"
                style="background: var(--card-bg); border-color: var(--border);">
          <div class="flex items-center gap-3">
            <button (click)="collapsed.set(!collapsed())"
                    class="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <h1 class="text-slate-700 font-semibold text-sm">Committee — simple rotating savings</h1>
          </div>
          <div class="flex items-center gap-3">
            <!-- Dark mode toggle -->
            <button (click)="isDark.set(!isDark())"
                    class="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              @if (isDark()) {
                <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75z..."/>
                  <path fill-rule="evenodd" d="M12 5.25a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5z" clip-rule="evenodd"/>
                </svg>
              } @else {
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
              }
            </button>
            <span class="text-sm font-medium text-slate-600">{{ auth.currentUser?.name }}</span>
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                 style="background: linear-gradient(135deg,#6366F1,#8B5CF6);">
              {{ initials() }}
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    aside { position: relative; }
    :host { display: block; height: 100%; }
  `],
})
export class AdminLayoutComponent {
  collapsed = signal(false);
  isDark = signal(false);

  constructor(public auth: AuthService) {}

  initials = computed(() => {
    const name = this.auth.currentUser?.name || '';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  });

  private allNav: NavItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/dashboard' },
    { label: 'Committees', icon: '🏦', route: '/committees' },
    { label: 'Members', icon: '👥', route: '/members', roles: ['ORGANIZER'] },
    { label: 'Rounds', icon: '🔄', route: '/rounds' },
  ];

  visibleNav = computed(() => {
    const role = this.auth.currentUser?.role;
    return this.allNav.filter(n => !n.roles || (role && n.roles.includes(role)));
  });
}
