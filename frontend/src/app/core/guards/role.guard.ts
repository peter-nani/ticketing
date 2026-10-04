import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRoleDto } from '../../api/generated';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as UserRoleDto[] | undefined;
  return auth.ensureUser().pipe(
    map((user) => user && allowedRoles?.includes(user.role ?? UserRoleDto.Customer)
      ? true
      : router.createUrlTree(['/dashboard']))
  );
};
