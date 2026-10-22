import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UnauthorizedError, ForbiddenError } from '../exceptions/domain.exceptions';
import type { UserRole } from '../enums/domain.enum';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/** Enforces the {@link Roles} metadata declared on controllers/handlers. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles(...) => authentication is sufficient (any signed-in account).
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenError('Access denied. Insufficient role for this resource.');
    }

    return true;
  }
}
