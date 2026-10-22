import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { getDashboardRoute } from '../../core/auth/dashboard-route';
import { Role } from '../../core/models/auth';
import { LoginAuthComponent } from './login-auth.component';
import { RegisterFormComponent } from './register-form.component';
import { RoleSelectorComponent } from './role-selector.component';

/** Step 1 = role picker, step 2 = the actual credential form. */
type AuthStep = 1 | 2;

/**
 * Auth page backing `/login`, `/register` and `/admin`.
 *
 * The route's `mode` data is bound to the `mode` input, so a single component
 * reproduces the React `Auth` page's three entry points: sign-in skips the role
 * picker, registration starts with it. Already-signed-in visitors are routed
 * straight to their dashboard.
 */
@Component({
  selector: 'app-auth-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RoleSelectorComponent, LoginAuthComponent, RegisterFormComponent],
  template: `
    <section [class]="sectionClass()">
      <div [class]="containerClass()">
        @if (step() === 1) {
          <app-role-selector
            [isLogin]="isLogin()"
            (select)="onRoleSelect($event)"
            (toggleMode)="toggleAuthMode()"
          />
        } @else if (isLogin()) {
          <app-login-auth (toggleMode)="toggleAuthMode()" />
        } @else {
          <app-register-form
            [role]="role()"
            (back)="stepOverride.set(null)"
            (toggleMode)="toggleAuthMode()"
          />
        }
      </div>
    </section>
  `,
})
export class AuthPage {
  /** Which flow the route asked for (bound from route `data.mode`). */
  readonly mode = input<'login' | 'register'>('login');

  /** Selected registration role; kept across back/forward within the page. */
  readonly role = signal<Role>('seeker');

  /** Manual step override set by the role picker (cleared on mode change). */
  readonly stepOverride = signal<AuthStep | null>(null);

  /** True for `/login` and `/admin`, false for `/register`. */
  readonly isLogin = computed(() => this.mode() === 'login');

  /** Current step — sign-in always starts on the credential form. */
  readonly step = computed<AuthStep>(() => this.stepOverride() ?? (this.isLogin() ? 2 : 1));

  /** Section spacing differs between the centered login and the top-aligned register. */
  readonly sectionClass = computed(() =>
    this.isLogin()
      ? 'px-6 min-h-screen pt-44 pb-24 flex items-center justify-center'
      : 'px-6 min-h-screen pt-32 pb-16',
  );

  /** Width of the column holding the current step. */
  readonly containerClass = computed(() => (this.isLogin() ? 'max-w-xl w-full' : 'w-full'));

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Switching between /login and /register must always restart at step 1/2
    // even if the router reuses this component instance.
    effect(() => {
      this.mode();
      this.stepOverride.set(null);
    });

    // A session that already exists has nowhere to go but its dashboard.
    effect(() => {
      const user = this.auth.user();
      if (user) {
        void this.router.navigateByUrl(getDashboardRoute(user.role), { replaceUrl: true });
      }
    });
  }

  /** Advances registration to the form for the picked identity. */
  onRoleSelect(role: Role): void {
    this.role.set(role);
    this.stepOverride.set(2);
  }

  /** Flips between the login and register flows (as the React toggle did). */
  toggleAuthMode(): void {
    void this.router.navigate([this.isLogin() ? '/register' : '/login']);
  }
}
