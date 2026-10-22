import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../enums/domain.enum';

export const ROLES_KEY = 'roles';

/** Declares which roles may reach a controller or handler. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
