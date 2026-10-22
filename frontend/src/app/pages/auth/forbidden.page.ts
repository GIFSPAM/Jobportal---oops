import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { getDashboardRoute } from '../../core/auth/dashboard-route';
import { PageContainerComponent } from '../../shared';
import { IconComponent } from '../../shared';

/**
 * `/forbidden`: shown when a signed-in user tries to access a route their role
 * doesn't allow. Mirrors the React `ForbiddenPage`.
 */
@Component({
  selector: 'app-forbidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageContainerComponent, RouterLink, IconComponent],
  template: `
    <app-page-container maxWidthClass="max-w-md" contentClassName="text-center py-16">
      <app-icon name="shield" [size]="64" class="mx-auto text-red-500/50" />
      <h1 class="mt-6 text-3xl font-display font-bold text-[#1F2A24]">Access Denied</h1>
      <p class="mt-3 text-text-muted">
        You don't have permission to access that page. Your account role is
        <strong class="capitalize">{{ auth.user()?.role ?? 'unknown' }}</strong>.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <a
          [routerLink]="dashboardRoute()"
          class="btn-primary py-3 px-8 text-base rounded-full"
        >
          <app-icon name="layout-dashboard" [size]="18" class="mr-2" /> My Dashboard
        </a>
        <a
          routerLink="/"
          class="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-[#D8D2C4] text-[#1F2A24] font-bold hover:border-brand-accent hover:text-brand-accent transition-colors"
        >
          <app-icon name="home" [size]="18" class="mr-2" /> Home
        </a>
      </div>

      <p class="mt-6 text-sm text-text-muted">
        If you believe this is a mistake, please
        <a href="mailto:support@jobytes.test" class="text-brand-accent hover:underline">contact support</a>.
      </p>
    </app-page-container>
  `,
})
export class ForbiddenPage {
  private readonly auth = inject(AuthService);

  readonly dashboardRoute = computed(() => getDashboardRoute(this.auth.user()?.role ?? 'jobseeker'));
}