import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (roles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.currentUser?.role;
    if (role && roles.includes(role)) return true;
    router.navigate(['/dashboard']);
    return false;
  };
};
