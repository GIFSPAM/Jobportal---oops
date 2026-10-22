import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { BackendRole } from '../models';
import { getDashboardRoute } from './dashboard-route';

/**
 * Route guard factory: requires a signed-in user and, when roles are given,
 * that the user's role is one of them.
 *
 * Mirrors the React `ProtectedRoute`: anonymous users go to `/login`, users
 * with a different role are redirected to their own dashboard.
 */
export function authGuard(...roles: BackendRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();

    if (!user) {
      return router.createUrlTree(['/login']);
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      return router.createUrlTree([getDashboardRoute(user.role)]);
    }

    return true;
  };
}
