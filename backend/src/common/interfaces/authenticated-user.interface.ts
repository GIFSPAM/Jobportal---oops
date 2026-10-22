import type { UserRole } from '../enums/domain.enum';

/** Verified request identity value object. */
export interface AuthenticatedUser {
  readonly userId: number;
  readonly role: UserRole;
  readonly email: string;
}
