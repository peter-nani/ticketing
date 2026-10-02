import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  const expectedRole = route.data['role'] as string;

  if (user && user.role === expectedRole) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
