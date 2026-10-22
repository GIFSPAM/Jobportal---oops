import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { JobsService } from '../../core/jobs/jobs.service';
import { Job } from '../../core/models/job';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import { PageContainerComponent } from '../../shared';
import { ExploreJobsFiltersComponent } from './explore-jobs-filters.component';
import { ExploreJobsHeaderComponent } from './explore-jobs-header.component';
import { ExploreJobsResultsComponent } from './explore-jobs-results.component';
import {
  filterJobsForExplore,
  uniqueJobTypesFrom,
  uniqueSkillsFrom,
} from './explore-jobs.filters';

/** Sentinel value meaning "no filter". */
const ALL = 'all';

/**
 * `/explore-jobs`: full catalogue with search/type/skill filtering plus the
 * seeker-only apply and save actions.
 *
 * All state lives here as signals; children are pure presentation, mirroring
 * the React `useExploreJobs` hook's responsibilities. The filter rules
 * themselves live in `explore-jobs.filters` (the ported `jobExploreFilters`
 * util) so they stay unit-testable without a component.
 */
@Component({
  selector: 'app-explore-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ExploreJobsFiltersComponent,
    ExploreJobsHeaderComponent,
    ExploreJobsResultsComponent,
    PageContainerComponent,
  ],
  template: `
    <app-page-container maxWidthClass="max-w-7xl" contentClassName="space-y-6">
      <app-explore-jobs-header [loading]="loading()" [resultCount]="filteredJobs().length" />

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
        [showActions]="isSeeker()"
        [appliedJobIds]="appliedJobIds()"
        [savedJobIds]="savedJobIds()"
        [applyingJobId]="applyingJobId()"
        [savingJobId]="savingJobId()"
        (applyRequested)="onApply($event)"
        (saveRequested)="onToggleSave($event)"
      />
    </app-page-container>
  `,
})
export class ExploreJobsPage {
  private readonly jobsService = inject(JobsService);
  private readonly seekerService = inject(SeekerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Job list loaded from the public catalogue. */
  readonly jobs = signal<Job[]>([]);

  /** True until the catalogue request settles. */
  readonly loading = signal(true);

  /** Filter state — owned here, emitted up from the filter bar. */
  readonly searchQuery = signal('');
  readonly jobTypeFilter = signal(ALL);
  readonly skillFilter = signal(ALL);

  /** Seeker-only per-job state (applied/saved sets + in-flight job ids). */
  readonly savedJobIds = signal<number[]>([]);
  readonly appliedJobIds = signal<number[]>([]);
  readonly savingJobId = signal<number | null>(null);
  readonly applyingJobId = signal<number | null>(null);

  /** Apply/save actions only exist for signed-in job seekers. */
  readonly isSeeker = computed(() => this.auth.user()?.role === 'jobseeker');

  /** Distinct job types present in the data, always prefixed with `all`. */
  readonly availableJobTypes = computed(() => uniqueJobTypesFrom(this.jobs()));

  /** Distinct skills present in the data, always prefixed with `all`. */
  readonly availableSkills = computed(() => uniqueSkillsFrom(this.jobs()));

  /** Search + type + skill filtering, ported from `jobExploreFilters`. */
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

    if (this.isSeeker()) {
      forkJoin({
        saved: this.seekerService.savedJobs(),
        applied: this.seekerService.applications(),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ saved, applied }) => {
            this.savedJobIds.set(saved.map((item) => Number(item.job_id)).filter(Number.isInteger));
            this.appliedJobIds.set(
              applied.map((item) => Number(item.job_id)).filter(Number.isInteger),
            );
          },
          error: (error: unknown) => {
            this.toast.error(this.message(error, 'Failed to fetch job actions'));
          },
        });
    }
  }

  /** Submits an application for a job the seeker has not applied to yet. */
  onApply(jobId: number): void {
    if (!this.isSeeker() || this.appliedJobIds().includes(jobId)) {
      return;
    }

    this.applyingJobId.set(jobId);
    this.seekerService
      .apply(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.applyingJobId.set(null);
          this.appliedJobIds.update((ids) => (ids.includes(jobId) ? ids : [...ids, jobId]));
          this.toast.success('Application submitted.');
        },
        error: (error: unknown) => {
          this.applyingJobId.set(null);
          this.toast.error(this.message(error, 'Failed to apply for job'));
        },
      });
  }

  /** Saves the job, or removes it when it is already saved. */
  onToggleSave(jobId: number): void {
    if (!this.isSeeker()) {
      return;
    }

    const alreadySaved = this.savedJobIds().includes(jobId);
    this.savingJobId.set(jobId);

    const request = alreadySaved
      ? this.seekerService.removeSavedJob(jobId)
      : this.seekerService.saveJob(jobId);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingJobId.set(null);
        this.savedJobIds.update((ids) =>
          alreadySaved ? ids.filter((id) => id !== jobId) : [...ids, jobId],
        );
        this.toast.success(alreadySaved ? 'Removed from saved jobs.' : 'Job saved.');
      },
      error: (error: unknown) => {
        this.savingJobId.set(null);
        this.toast.error(this.message(error, 'Failed to update saved jobs'));
      },
    });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
