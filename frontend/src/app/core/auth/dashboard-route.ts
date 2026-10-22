import { BackendRole } from '../models/auth';

/**
 * Maps a backend role onto its dashboard route.
 *
 * Single switch used by the guard, the auth pages and the nav, so a route rename
 * can never leave one of them pointing at a dead URL.
 */
export function getDashboardRoute(role: BackendRole): string {
  switch (role) {
    case 'jobseeker':
      return '/seeker/dashboard';
    case 'employer':
      return '/employer/dashboard';
    case 'admin':
      return '/admin/dashboard';
  }
}
