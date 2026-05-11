import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'committees',
        loadComponent: () => import('./features/committees/committees.component').then((m) => m.CommitteesComponent),
      },
      {
        path: 'committees/:id',
        loadComponent: () =>
          import('./features/committees/committee-detail/committee-detail.component').then((m) => m.CommitteeDetailComponent),
      },
      {
        path: 'members',
        loadComponent: () => import('./features/members/members.component').then((m) => m.MembersComponent),
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'rounds',
        loadComponent: () => import('./features/rounds/rounds.component').then((m) => m.RoundsComponent),
      },
      {
        path: 'profile/me',
        loadComponent: () =>
          import('./features/profile/trust-profile.component').then((m) => m.TrustProfileComponent),
      },
      {
        path: 'profile/:id',
        loadComponent: () =>
          import('./features/profile/trust-profile.component').then((m) => m.TrustProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
