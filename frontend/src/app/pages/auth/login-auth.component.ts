import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { getDashboardRoute } from '../../core/auth/dashboard-route';
import { ToastService } from '../../core/toast/toast.service';
import { AuthFieldComponent } from './auth-field.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Sign-in card used by `/login` and `/admin`.
 *
 * Submitting delegates to {@link AuthService} (which persists the token), then
 * routes to the dashboard encoded in the response — the same flow as the React
 * `LoginAuth`.
 */
@Component({
  selector: 'app-login-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AuthFieldComponent],
  template: `
    <div class="glass-card p-10 border-[#D8D2C4] bg-white page-enter">
      <div class="text-center mb-10">
        <div
          class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-brand-accent/10 text-brand-accent"
        >
          <app-icon name="lock" [size]="32" />
        </div>
        <h2 class="text-3xl font-display font-bold text-[#1F2A24] mb-3">Welcome Back</h2>
        <p class="text-text-muted">Sign in to your account</p>
      </div>

      <form (submit)="submit($event)" class="space-y-5">
        <app-auth-field
          label="Email Address"
          icon="mail"
          type="email"
          placeholder="name@example.com"
          autocomplete="email"
          [required]="true"
          [value]="email()"
          (valueChange)="email.set($event)"
        />
        <app-auth-field
          label="Password"
          icon="lock"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          [required]="true"
          [value]="password()"
          (valueChange)="password.set($event)"
        />

        <button
          type="submit"
          [disabled]="loading()"
          class="w-full py-4 mt-4 font-bold rounded-xl transition-all shadow-lg btn-primary disabled:opacity-60"
        >
          {{ loading() ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-8 text-center">
        <button
          type="button"
          (click)="toggleMode.emit()"
          class="text-sm text-text-muted hover:text-brand-accent transition-colors font-bold"
        >
          Don't have an account? Register
        </button>
      </div>
    </div>
  `,
})
export class LoginAuthComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Email field value. */
  readonly email = signal('');

  /** Password field value. */
  readonly password = signal('');

  /** True while the request is in flight (disables the submit button). */
  readonly loading = signal(false);

  /** Emits when the user asks to switch to the register flow. */
  readonly toggleMode = output<void>();

  /** Posts the credentials and routes to the caller's dashboard on success. */
  submit(event: Event): void {
    event.preventDefault();
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.auth
      .login({ email: this.email(), password: this.password() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.loading.set(false);
          void this.router.navigateByUrl(
            session.role ? getDashboardRoute(session.role) : '/',
            { replaceUrl: true },
          );
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(error instanceof Error ? error.message : 'Login failed');
        },
      });
  }
}
