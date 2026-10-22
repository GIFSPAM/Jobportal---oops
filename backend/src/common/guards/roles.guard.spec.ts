import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard';
import { ForbiddenError, UnauthorizedError } from '../exceptions/domain.exceptions';
import { UserRole } from '../enums/domain.enum';

/** Builds a guard whose reflector returns `roles`, as `@Roles(...)` would. */
function buildGuard(roles?: UserRole[]): RolesGuard {
  const reflector = {
    getAllAndOverride: vi.fn(() => roles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

function contextWith(user?: unknown): ExecutionContext {
  return {
    // The guard builds the reflector's target list eagerly, so the context has
    // to supply both halves even though the stubbed reflector ignores them.
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows any authenticated account when no role is required', () => {
    const guard = buildGuard();
    expect(guard.canActivate(contextWith({ role: UserRole.JOBSEEKER, userId: 5 }))).toBe(true);
  });

  it('allows a caller whose role is in the required set', () => {
    const guard = buildGuard([UserRole.EMPLOYER]);
    expect(guard.canActivate(contextWith({ role: UserRole.EMPLOYER, userId: 5 }))).toBe(true);
  });

  it('rejects a caller whose role is not required with 403', () => {
    const guard = buildGuard([UserRole.ADMIN]);
    try {
      guard.canActivate(contextWith({ role: UserRole.JOBSEEKER, userId: 5 }));
      throw new Error('expected the guard to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).getStatus()).toBe(403);
    }
  });

  it('rejects with 401 when nothing resolved a user, i.e. authentication failed', () => {
    const guard = buildGuard([UserRole.ADMIN]);
    try {
      guard.canActivate(contextWith(undefined));
      throw new Error('expected the guard to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as UnauthorizedError).getStatus()).toBe(401);
    }
  });

  it('is a no-op when metadata exists but names no roles', () => {
    const guard = buildGuard([]);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });
});
