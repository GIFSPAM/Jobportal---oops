/** Role as chosen by the user in the UI (the register form speaks this vocabulary). */
export type Role = 'seeker' | 'employer' | 'admin';

/** Role as carried by the JWT and the backend (`seeker` becomes `jobseeker`). */
export type BackendRole = 'jobseeker' | 'employer' | 'admin';

/** Decoded identity stored in the auth signal — just enough to guard routes. */
export interface AuthUser {
  user_id: number;
  role: BackendRole;
}

/** `data` payload shared by `/auth/login` and `/auth/register`. */
export interface AuthSession {
  user_id: number;
  email: string;
  role: BackendRole;
  is_active: boolean;
  created_at: string;
  token: string;
}

/** Body of `POST /api/auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Body of `POST /api/auth/register`.
 *
 * Only the fields relevant to the chosen role are sent, mirroring the React
 * `buildRegisterBody` helper.
 */
export interface RegisterRequest {
  role: Role;
  email: string;
  password: string;
  secretKey?: string;
  full_name?: string;
  phone_number?: string;
  education?: string;
  experience_years?: number;
  company_name?: string;
  industry?: string;
  company_size?: string;
  company_location?: string;
  company_website?: string;
  company_phone?: string;
}

/** Claims we rely on when decoding the JWT client-side. */
export interface JwtPayload {
  user_id?: number;
  role?: BackendRole;
  exp?: number;
  iat?: number;
}
