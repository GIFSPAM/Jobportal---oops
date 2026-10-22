import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { JobsService, PublicJobFilters } from '../../core/jobs/jobs.service';
import { Job } from '../../core/models/job';
import { ToastService } from '../../core/toast/toast.service';
import { PageContainerComponent } from '../../shared';
import { ExploreJobsFiltersComponent } from '../explore-jobs/explore-jobs-filters.component';
import { ExploreJobsHeaderComponent } from '../explore-jobs/explore-jobs-header.component';
import { ExploreJobsResultsComponent } from '../explore-jobs/explore-jobs-results.component';
import {
  filterJobsForExplore,
  uniqueJobTypesFrom,
  uniqueSkillsFrom,
} from '../explore-jobs/explore-jobs.filters';

const ALL = 'all';

/**
 * `/jobs`: public browse page (no auth required).
 *
 * Mirrors the React `ExploreJobs` but without the seeker-only apply/save actions.
 * Uses the same filter/result components so behaviour stays consistent.
 */
@Component({
  selector: 'app-jobs-browse-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ExploreJobsFiltersComponent,
    ExploreJobsHeaderComponent,
    ExploreJobsResultsComponent,
    PageContainerComponent,
  ],
  template: `
    <app-page-container maxWidthClass="max-w-7xl" contentClassName="space-y-6">
      <app-explore-jobs-header
        [loading]="loading()"
        [resultCount]="filteredJobs().length"
      />

      <app-explore-jobs-filters
        [searchQuery]="searchQuery()"
        (searchChange)="searchQuery.set($event)"
        [jobTypeFilter]="jobTypeFilter()"
        (jobTypeChange)="jobTypeFilter.set($event)"
        [skillFilter]="skillFilter()"
        (skillChange)="skillFilter.set($event)"
        [availableJobTypes]="availableJobTypes()"
        [availableSkills]="availableSkills()"
      />

      <app-explore-jobs-results
        [loading]="loading()"
        [jobs]="filteredJobs()"
        [showActions]="false"
      />
    </app-page-container>
  `,
})
export class JobsBrowsePage {
  private readonly jobsService = inject(JobsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly jobs = signal<Job[]>([]);
  readonly loading = signal(true);

  readonly searchQuery = signal('');
  readonly jobTypeFilter = signal(ALL);
  readonly skillFilter = signal(ALL);

  readonly availableJobTypes = computed(() => uniqueJobTypesFrom(this.jobs()));
  readonly availableSkills = computed(() => uniqueSkillsFrom(this.jobs()));

  readonly filteredJobs = computed(() =>
    filterJobsForExplore(this.jobs(), {
      searchQuery: this.searchQuery(),
      jobTypeFilter: this.jobTypeFilter(),
      skillFilter: this.skillFilter(),
    }),
  );

  constructor() {
    this.jobsService
      .publicJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.loading.set(false);
        },
        error: () => {
          this.jobs.set([]);
          this.loading.set(false);
        },
      });
  }
}