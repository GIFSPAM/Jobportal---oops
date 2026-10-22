import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AdminService } from '../../core/admin/admin.service';
import { AdminJob } from '../../core/models/admin';
import { ToastService } from '../../core/toast/toast.service';
import { PageContainerComponent, IconComponent } from '../../shared';
import { AdminJobsTabComponent, AdminVerificationFilter } from './admin-jobs-tab.component';

/**
 * `/admin/jobs/moderation`: dedicated job moderation page.
 *
 * Mirrors the `jobs` tab of the dashboard but stands alone with its own
 * data loading and action handling. Uses the same presentation component.
 */
@Component({
  selector: 'app-admin-jobs-moderation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminJobsTabComponent, PageContainerComponent, IconComponent],
  template: `
    <app-page-container>
      <header class="page-enter">
        <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-3">
          <app-icon name="briefcase" [size]="32" class="text-text-muted" /> Job Moderation
        </h1>
        <p class="text-text-muted mt-1">Review, verify/unverify, and delete job postings.</p>
      </header>

      <app-admin-jobs-tab
        [loading]="loading()"
        [jobs]="jobs()"
        [pendingJobsCount]="pendingJobs().length"
        [filteredJobs]="filteredJobs()"
        [jobIdSearchQuery]="jobIdSearchQuery()"
        [jobTitleSearchQuery]="jobTitleSearchQuery()"
        [jobLocationFilter]="jobLocationFilter()"
        [availableJobLocations]="availableJobLocations()"
        [jobTypeFilter]="jobTypeFilter()"
        [availableJobTypes]="availableJobTypes()"
        [jobVerificationFilter]="jobVerificationFilter()"
        [actionKey]="actionKey()"
        (jobIdSearchChange)="jobIdSearchQuery.set($event)"
        (jobTitleSearchChange)="jobTitleSearchQuery.set($event)"
        (jobLocationFilterChange)="jobLocationFilter.set($event)"
        (jobTypeFilterChange)="jobTypeFilter.set($event)"
        (jobVerificationFilterChange)="onVerificationFilterChange($event)"
        (openJob)="openJob($event)"
        (toggleVerification)="onToggleJobVerification($event)"
        (deleteJob)="onDeleteJob($event)"
      />
    </app-page-container>
  `,
})
export class AdminJobsModerationPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);

  readonly jobs = signal<AdminJob[]>([]);

  readonly jobIdSearchQuery = signal('');
  readonly jobTitleSearchQuery = signal('');
  readonly jobLocationFilter = signal('all');
  readonly jobTypeFilter = signal('all');
  readonly jobVerificationFilter = signal<AdminVerificationFilter>('all');

  readonly actionKey = signal<string | null>(null);

  readonly pendingJobs = computed(() =>
    this.jobs().filter((job) => !Boolean(job.is_verified)),
  );

  readonly filteredJobs = computed(() => {
    const idQuery = this.jobIdSearchQuery().trim();
    const titleQuery = this.jobTitleSearchQuery().trim().toLowerCase();
    const location = this.jobLocationFilter();
    const jobType = this.jobTypeFilter();
    const verification = this.jobVerificationFilter();

    return this.jobs().filter((job) => {
      const matchesId = !idQuery || String(job.job_id).includes(idQuery);
      const matchesTitle =
        !titleQuery || String(job.title ?? '').toLowerCase().includes(titleQuery);
      const matchesLocation = location === 'all' || String(job.location ?? '') === location;
      const matchesJobType = jobType === 'all' || String(job.job_type ?? '') === jobType;
      const matchesVerification =
        verification === 'all' ||
        (verification === 'verified' ? Boolean(job.is_verified) : !Boolean(job.is_verified));
      return matchesId && matchesTitle && matchesLocation && matchesJobType && matchesVerification;
    });
  });

  readonly availableJobLocations = computed(() =>
    Array.from(
      new Set(
        this.jobs()
          .map((job) => String(job.location ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  );

  readonly availableJobTypes = computed(() =>
    Array.from(
      new Set(
        this.jobs()
          .map((job) => String(job.job_type ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  );

  constructor() {
    this.loadJobs();
  }

  private loadJobs(): void {
    this.admin
      .jobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load jobs'));
        },
      });
  }

  onVerificationFilterChange(value: string): void {
    this.jobVerificationFilter.set(
      value === 'verified' || value === 'unverified' ? value : 'all',
    );
  }

  openJob(job: AdminJob): void {
    this.router.navigate(['/admin/jobs', job.job_id], { state: { job } });
  }

  onToggleJobVerification(job: AdminJob): void {
    const nextVerified = !Boolean(job.is_verified);
    this.actionKey.set(`job-verify-toggle-${job.job_id}`);

    const request = nextVerified ? this.admin.verifyJob(job.job_id) : this.admin.unverifyJob(job.job_id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(nextVerified ? 'Job verified' : 'Job unverified');
        this.loadJobs();
        this.actionKey.set(null);
      },
      error: (error: unknown) => {
        this.actionKey.set(null);
        this.toast.error(this.message(error, 'Failed to update verification'));
      },
    });
  }

  onDeleteJob(job: AdminJob): void {
    if (!window.confirm(`Delete job #${job.job_id}? This cannot be undone.`)) return;

    this.actionKey.set(`job-delete-${job.job_id}`);
    this.admin
      .deleteJob(job.job_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Job deleted');
          this.loadJobs();
          this.actionKey.set(null);
        },
        error: (error: unknown) => {
          this.actionKey.set(null);
          this.toast.error(this.message(error, 'Failed to delete job'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}