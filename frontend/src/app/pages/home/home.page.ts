import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JobsService } from '../../core/jobs/jobs.service';
import { Job } from '../../core/models/job';
import { HomeFeaturesSectionComponent } from './home-features.component';
import { HomeHeroComponent } from './home-hero.component';
import { HomeLatestJobsSectionComponent } from './home-latest-jobs.component';

/**
 * Public landing page.
 *
 * Owns exactly one thing: fetching the landing jobs once and exposing them as
 * signals; hero, latest-jobs and features are independent presentational
 * children (mirrors the React `Home` page).
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HomeHeroComponent, HomeLatestJobsSectionComponent, HomeFeaturesSectionComponent],
  template: `
    <div class="bg-grid min-h-screen">
      <app-home-hero />
      <app-home-latest-jobs [jobs]="jobs()" [loading]="loading()" />
      <app-home-features />
    </div>
  `,
})
export class HomePage {
  private readonly jobsService = inject(JobsService);
  private readonly destroyRef = inject(DestroyRef);

  /** Landing jobs, empty until the request resolves. */
  readonly jobs = signal<Job[]>([]);

  /** True while the landing jobs request is in flight. */
  readonly loading = signal(true);

  constructor() {
    this.jobsService
      .landingJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          // The home page degrades to an empty grid — matching the React app,
          // which only logs the failure instead of surfacing a toast.
          console.error('Failed to fetch jobs:', error);
          this.jobs.set([]);
          this.loading.set(false);
        },
      });
  }
}
