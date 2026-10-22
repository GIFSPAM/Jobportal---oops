import type { User } from '../../../database/entities';

/** Transport shape of `/auth/login` and `/auth/register`. */
export interface AuthResponse {
  user_id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  token: string;
}

export function toAuthResponse(user: User, token: string): AuthResponse {
  return {
    user_id: user.userId,
    email: user.email,
    role: user.role,
    is_active: user.isActive,
    created_at: user.createdAt,
    token,
  };
}
