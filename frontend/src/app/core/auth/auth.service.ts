import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../http/api.service';
import { JsonRecord } from '../models/api';
import { AuthSession, AuthUser, BackendRole, LoginRequest, RegisterRequest, Role } from '../models/auth';
import { TOKEN_STORAGE_KEY, decodeJwtPayload } from './token.util';

/** Converts the UI role vocabulary (`seeker`) into the API role (`jobseeker`). */
export function toBackendRole(role: Role): BackendRole {
  return role === 'seeker' ? 'jobseeker' : role;
}

/** Reads the stored token and decodes it into a user, or `null` when absent. */
function restoreUser(): AuthUser | null {
  const payload = decodeJwtPayload(localStorage.getItem(TOKEN_STORAGE_KEY));
  return payload?.user_id && payload.role ? { user_id: payload.user_id, role: payload.role } : null;
}

/**
 * Owns the authentication session: the JWT in localStorage plus the decoded
 * identity exposed as signals.
 *
 * Everything that needs "who am I" (guards, nav, role-aware pages) reads these
 * signals, so login/logout propagate everywhere without event plumbing.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  private readonly userState = signal<AuthUser | null>(restoreUser());

  /** Current JWT (`null` when logged out) — also drives the bearer interceptor. */
  readonly token = this.tokenState.asReadonly();

  /** Decoded identity used for routing and role checks. */
  readonly user = this.userState.asReadonly();

  /** Whether a session exists — drives nav links and guest-only redirects. */
  readonly isAuthenticated = computed(() => this.userState() !== null);

  /** `POST /api/auth/login`; stores the token as soon as it arrives. */
  login(request: LoginRequest): Observable<AuthSession> {
    return this.api.post<AuthSession>('/auth/login', request).pipe(
      map((envelope) => this.requireSession(envelope.data, 'Login failed')),
      tap((session) => this.persist(session.token)),
    );
  }

  /** `POST /api/auth/register`; only sends the fields relevant to the role. */
  register(payload: RegisterRequest): Observable<AuthSession> {
    return this.api
      .post<AuthSession>('/auth/register', this.buildRegisterBody(payload))
      .pipe(
        map((envelope) => this.requireSession(envelope.data, 'Registration failed')),
        tap((session) => this.persist(session.token)),
      );
  }

  /** Clears the session locally; the server state is untouched by design. */
  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this.tokenState.set(null);
    this.userState.set(null);
  }

  /** Builds the register body, mirroring the backend's per-role field rules. */
  private buildRegisterBody(payload: RegisterRequest): JsonRecord {
    const role = toBackendRole(payload.role);
    const body: JsonRecord = {
      email: payload.email,
      password: payload.password,
      role,
    };

    if (role === 'jobseeker') {
      body['full_name'] = payload.full_name;
      body['phone_number'] = payload.phone_number;
      body['education'] = payload.education;
      body['experience_years'] = payload.experience_years;
    }

    if (role === 'employer') {
      body['company_name'] = payload.company_name;
      body['industry'] = payload.industry;
      body['company_size'] = payload.company_size;
      body['company_location'] = payload.company_location;
      body['company_website'] = payload.company_website;
      body['company_phone'] = payload.company_phone;
    }

    if (role === 'admin' && payload.secretKey) {
      body['secretKey'] = payload.secretKey;
    }

    return body;
  }

  /** Guards against a 200 response that carries no usable session. */
  private requireSession(session: AuthSession | undefined, fallback: string): AuthSession {
    if (!session?.token) {
      throw new Error(fallback);
    }
    return session;
  }

  /** Writes the token and publishes the decoded identity to the signals. */
  private persist(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    this.tokenState.set(token);
    const payload = decodeJwtPayload(token);
    this.userState.set(
      payload?.user_id && payload.role ? { user_id: payload.user_id, role: payload.role } : null,
    );
  }
}
