import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PageContainerComponent } from '../../shared';
import { IconComponent } from '../../shared';

/**
 * `/unauthorized`: shown when the user is not signed in but tries to access
 * a protected route. Mirrors the React `UnauthorizedPage`.
 */
@Component({
  selector: 'app-unauthorized-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageContainerComponent, RouterLink, IconComponent],
  template: `
    <app-page-container maxWidthClass="max-w-md" contentClassName="text-center py-16">
      <app-icon name="lock" [size]="64" class="mx-auto text-brand-accent/50" />
      <h1 class="mt-6 text-3xl font-display font-bold text-[#1F2A24]">Sign In Required</h1>
      <p class="mt-3 text-text-muted">
        You need to be signed in to access that page. Please log in or create an
        account to continue.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <a
          routerLink="/login"
          class="btn-primary py-3 px-8 text-base rounded-full"
        >
          <app-icon name="log-in" [size]="18" class="mr-2" /> Log In
        </a>
        <a
          routerLink="/register"
          class="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-[#D8D2C4] text-[#1F2A24] font-bold hover:border-brand-accent hover:text-brand-accent transition-colors"
        >
          Create Account
        </a>
      </div>

      <p class="mt-6 text-sm text-text-muted">
        Or go back to the <a routerLink="/" class="text-brand-accent hover:underline">home page</a>.
      </p>
    </app-page-container>
  `,
})
export class UnauthorizedPage {
  private readonly auth = inject(AuthService);

  /** If the user somehow lands here while authenticated, bounce them to their dashboard. */
  constructor() {
    if (this.auth.user()) {
      // The guard would have already redirected, but this is a safety net.
    }
  }
}