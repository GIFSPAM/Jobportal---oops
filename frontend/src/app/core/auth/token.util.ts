import { BackendRole, JwtPayload } from '../models/auth';

/** localStorage key holding the JWT — shared by auth state and the HTTP interceptor. */
export const TOKEN_STORAGE_KEY = 'token';

/**
 * Decodes the payload segment of a JWT without verifying it.
 *
 * Verification is the server's job; the client only needs `user_id`/`role` to
 * pick the right dashboard and guard routes. Returns `null` for anything that
 * is not a well-formed token instead of throwing, so callers stay branch-free.
 */
export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

/** Reads just the backend role from a token, or `null` when it cannot be trusted. */
export function decodeRole(token: string | null | undefined): BackendRole | null {
  return decodeJwtPayload(token)?.role ?? null;
}
