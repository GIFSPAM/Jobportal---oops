import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PageContainerComponent } from '../../shared';
import { IconComponent } from '../../shared';

/**
 * `**` (404): shown when no route matches. Mirrors the React `NotFoundPage`.
 */
@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageContainerComponent, RouterLink, IconComponent],
  template: `
    <app-page-container maxWidthClass="max-w-md" contentClassName="text-center py-16">
      <app-icon name="search-x" [size]="64" class="mx-auto text-text-muted/50" />
      <h1 class="mt-6 text-5xl md:text-7xl font-display font-bold text-[#1F2A24]">404</h1>
      <p class="mt-3 text-xl text-text-muted">Page Not Found</p>
      <p class="mt-2 text-text-muted">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <a
          [routerLink]="defaultRoute()"
          class="btn-primary py-3 px-8 text-base rounded-full"
        >
          <app-icon name="layout-dashboard" [size]="18" class="mr-2" />
          {{ defaultLabel() }}
        </a>
        <a
          routerLink="/"
          class="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-[#D8D2C4] text-[#1F2A24] font-bold hover:border-brand-accent hover:text-brand-accent transition-colors"
        >
          <app-icon name="home" [size]="18" class="mr-2" /> Home
        </a>
      </div>

      <div class="mt-10 grid grid-cols-3 gap-4 text-center">
        <a routerLink="/explore-jobs" class="text-sm font-bold text-[#6B6459] hover:text-[#D4622A] transition-colors">
          <app-icon name="briefcase" [size]="20" class="mx-auto mb-1" /> Browse Jobs
        </a>
        <a routerLink="/register" class="text-sm font-bold text-[#6B6459] hover:text-[#D4622A] transition-colors">
          <app-icon name="user-plus" [size]="20" class="mx-auto mb-1" /> Join Now
        </a>
        <a routerLink="/login" class="text-sm font-bold text-[#6B6459] hover:text-[#D4622A] transition-colors">
          <app-icon name="log-in" [size]="20" class="mx-auto mb-1" /> Sign In
        </a>
      </div>
    </app-page-container>
  `,
})
export class NotFoundPage {
  private readonly auth = inject(AuthService);

  readonly defaultRoute = computed(() => {
    const role = this.auth.user()?.role ?? 'guest';
    if (role === 'jobseeker') return '/seeker/dashboard';
    if (role === 'employer') return '/employer/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/';
  });

  readonly defaultLabel = computed(() => {
    const role = this.auth.user()?.role ?? 'guest';
    if (role === 'jobseeker') return 'My Dashboard';
    if (role === 'employer') return 'My Dashboard';
    if (role === 'admin') return 'Admin Panel';
    return 'Home';
  });
}