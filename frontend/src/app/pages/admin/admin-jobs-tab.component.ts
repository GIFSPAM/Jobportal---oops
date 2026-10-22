import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { AdminJob } from '../../core/models/admin';
import {
  FooterActionsDirective,
  IconComponent,
  JobCardComponent,
  MetaBadgeDirective,
  SkeletonComponent,
} from '../../shared';
import { toCardJob } from './admin-format';

/** Verification filter options offered by the select. */
export type AdminVerificationFilter = 'all' | 'verified' | 'unverified';

/** Placeholder bars shown while the job list loads. */
const SKELETON_ROWS = [1, 2, 3, 4];

/** A job list row with its card model and badges precomputed. */
interface JobRow {
  job: AdminJob;
  card: ReturnType<typeof toCardJob>;
  skills: string[];
  verified: boolean;
  verifiedLabel: string;
  verifiedClass: string;
}

/**
 * `jobs` tab of the admin dashboard: id/title/location/type/verification
 * filters plus the verify-toggle and delete actions (ports the React
 * `AdminJobsTab`).
 *
 * Pure presentation — clicking a card emits `openJob`; the page performs the
 * navigation and the moderation requests.
 */
@Component({
  selector: 'app-admin-jobs-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    JobCardComponent,
    MetaBadgeDirective,
    FooterActionsDirective,
    SkeletonComponent,
    NgClass,
  ],
  template: `
    <div class="glass-card p-8">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-6">
        <div>
          <h2 class="text-lg font-display font-bold text-[#1F2A24] flex items-center gap-2">
            <app-icon class="text-brand-accent" name="briefcase" [size]="20" /> Job Moderation
          </h2>
          <div class="text-sm text-text-muted mt-1">
            {{ filteredJobs().length }} shown of {{ jobs().length }} jobs ·
            {{ pendingJobsCount() }} pending verification
          </div>
        </div>
        <div
          class="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.1fr)_minmax(11rem,0.9fr)_minmax(11rem,0.9fr)_minmax(11rem,0.9fr)]"
        >
          <div class="space-y-1 min-w-0">
            <label
              for="admin-job-id"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Job ID
            </label>
            <div class="relative">
              <app-icon
                class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                name="search"
                [size]="16"
              />
              <input
                #jobIdEl
                id="admin-job-id"
                type="search"
                class="input-field input-field-with-icon h-12 w-full min-w-0"
                placeholder="Search by Job ID"
                [value]="jobIdSearchQuery()"
                (input)="jobIdSearchChange.emit(jobIdEl.value)"
              />
            </div>
          </div>
          <div class="space-y-1 min-w-0">
            <label
              for="admin-job-title"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Title
            </label>
            <div class="relative">
              <app-icon
                class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                name="search"
                [size]="16"
              />
              <input
                #jobTitleEl
                id="admin-job-title"
                type="search"
                class="input-field input-field-with-icon h-12 w-full min-w-0"
                placeholder="Search by title"
                [value]="jobTitleSearchQuery()"
                (input)="jobTitleSearchChange.emit(jobTitleEl.value)"
              />
            </div>
          </div>
          <div class="space-y-1 min-w-0">
            <label
              for="admin-job-location"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Location
            </label>
            <select
              #locationEl
              id="admin-job-location"
              class="input-field h-12 w-full min-w-0"
              [value]="jobLocationFilter()"
              (change)="jobLocationFilterChange.emit(locationEl.value)"
            >
              <option value="all">All</option>
              @for (location of availableJobLocations(); track location) {
                <option [value]="location">{{ location }}</option>
              }
            </select>
          </div>
          <div class="space-y-1 min-w-0">
            <label
              for="admin-job-type"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Job Type
            </label>
            <select
              #typeEl
              id="admin-job-type"
              class="input-field h-12 w-full min-w-0"
              [value]="jobTypeFilter()"
              (change)="jobTypeFilterChange.emit(typeEl.value)"
            >
              <option value="all">All</option>
              @for (jobType of availableJobTypes(); track jobType) {
                <option [value]="jobType">{{ jobType }}</option>
              }
            </select>
          </div>
          <div class="space-y-1 min-w-0">
            <label
              for="admin-job-verification"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Verification
            </label>
            <select
              #verificationEl
              id="admin-job-verification"
              class="input-field h-12 w-full min-w-0"
              [value]="jobVerificationFilter()"
              (change)="jobVerificationFilterChange.emit(verificationEl.value)"
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (row of skeletonRows; track row) {
            <app-skeleton variant="row" />
          }
        </div>
      } @else if (jobs().length === 0) {
        <p class="text-sm text-text-muted text-center py-10">No jobs found.</p>
      } @else if (filteredJobs().length === 0) {
        <p class="text-sm text-text-muted text-center py-10">
          No jobs match the current filters.
        </p>
      } @else {
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[68vh] overflow-y-auto pr-2">
          @for (row of rows(); track row.job.job_id) {
            <div class="cursor-pointer" (click)="onCardClick($event, row.job)">
              <app-job-card [job]="row.card" [clickable]="false">
                <div metaBadge class="flex items-center gap-2 flex-wrap justify-end">
                  <span
                    class="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider"
                    [ngClass]="row.verifiedClass"
                  >
                    {{ row.verifiedLabel }}
                  </span>
                  <span
                    class="text-[10px] px-2.5 py-1 rounded-full border border-[#E8E3D8] bg-[#FAF8F3] text-text-muted font-bold uppercase tracking-wider"
                  >
                    {{ row.job.status ?? 'Unknown' }}
                  </span>
                </div>
                <div footerActions class="space-y-3" (click)="$event.stopPropagation()">
                  @if (row.skills.length > 0) {
                    <div class="flex flex-wrap gap-2">
                      @for (skill of row.skills; track skill) {
                        <span
                          class="px-2.5 py-1 rounded-full border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold"
                        >
                          {{ skill }}
                        </span>
                      }
                    </div>
                  }
                  <div class="flex items-center justify-end gap-3 flex-wrap">
                    <button
                      type="button"
                      [class]="verifyButtonClass(row.verified)"
                      [disabled]="isDeleteBusy(row.job) || isVerifyBusy(row.job)"
                      (click)="toggleVerification.emit(row.job)"
                    >
                      @if (row.verified) {
                        <app-icon name="undo" [size]="16" class="mr-2" />
                      } @else {
                        <app-icon name="check-circle" [size]="16" class="mr-2" />
                      }
                      {{ isVerifyBusy(row.job) ? 'Updating...' : row.verified ? 'Set Unverified' : 'Set Verified' }}
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center justify-center min-w-32 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 text-sm font-bold hover:bg-red-500/15 transition-all disabled:opacity-60"
                      [disabled]="isDeleteBusy(row.job) || isVerifyBusy(row.job)"
                      (click)="deleteJob.emit(row.job)"
                    >
                      <app-icon name="trash" [size]="16" class="mr-2" />
                      {{ isDeleteBusy(row.job) ? 'Deleting...' : 'Delete Job' }}
                    </button>
                  </div>
                </div>
              </app-job-card>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminJobsTabComponent {
  /** True while the dashboard data is still loading. */
  readonly loading = input(false);

  /** All jobs (for the "shown of" counter). */
  readonly jobs = input<AdminJob[]>([]);

  /** Number of jobs awaiting verification. */
  readonly pendingJobsCount = input(0);

  /** Jobs after the page's id/title/location/type/verification filters. */
  readonly filteredJobs = input<AdminJob[]>([]);

  /** Current Job ID search text. */
  readonly jobIdSearchQuery = input('');

  /** Current title search text. */
  readonly jobTitleSearchQuery = input('');

  /** Selected location filter (`'all'` for no filter). */
  readonly jobLocationFilter = input('all');

  /** Location options derived from the loaded jobs. */
  readonly availableJobLocations = input<string[]>([]);

  /** Selected job-type filter (`'all'` for no filter). */
  readonly jobTypeFilter = input('all');

  /** Job-type options derived from the loaded jobs. */
  readonly availableJobTypes = input<string[]>([]);

  /** Selected verification filter. */
  readonly jobVerificationFilter = input<AdminVerificationFilter>('all');

  /** Key of the in-flight row action (`job-delete-<id>` / `job-verify-toggle-<id>`). */
  readonly actionKey = input<string | null>(null);

  /** Emits the new Job ID search text. */
  readonly jobIdSearchChange = output<string>();

  /** Emits the new title search text. */
  readonly jobTitleSearchChange = output<string>();

  /** Emits the newly selected location filter. */
  readonly jobLocationFilterChange = output<string>();

  /** Emits the newly selected job-type filter. */
  readonly jobTypeFilterChange = output<string>();

  /** Emits the newly selected verification filter. */
  readonly jobVerificationFilterChange = output<string>();

  /** Emits when a card is opened (mouse click on the card body). */
  readonly openJob = output<AdminJob>();

  /** Emits when the verify/unverify button is pressed. */
  readonly toggleVerification = output<AdminJob>();

  /** Emits when the delete button is pressed (page shows the confirm). */
  readonly deleteJob = output<AdminJob>();

  /** Placeholder bars rendered while loading. */
  readonly skeletonRows = SKELETON_ROWS;

  /** Rows with card models and badges precomputed for the template. */
  readonly rows = computed<JobRow[]>(() =>
    this.filteredJobs().map((job) => {
      const verified = Boolean(job.is_verified);
      return {
        job,
        card: toCardJob(job),
        skills: Array.isArray(job.skills) ? job.skills.slice(0, 6) : [],
        verified,
        verifiedLabel: verified ? 'Verified' : 'Unverified',
        verifiedClass: verified
          ? 'text-green-700 bg-green-500/10 border-green-500/20'
          : 'text-red-700 bg-red-500/10 border-red-500/20',
      };
    }),
  );

  /** True while this job's delete request is in flight. */
  isDeleteBusy(job: AdminJob): boolean {
    return this.actionKey() === `job-delete-${job.job_id}`;
  }

  /** True while this job's verification toggle request is in flight. */
  isVerifyBusy(job: AdminJob): boolean {
    return this.actionKey() === `job-verify-toggle-${job.job_id}`;
  }

  /** Yellow "Set Unverified" vs green "Set Verified" button styling. */
  verifyButtonClass(verified: boolean): string {
    const base =
      'inline-flex items-center justify-center min-w-40 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all disabled:opacity-60';
    return verified
      ? `${base} border-yellow-500/20 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/15`
      : `${base} border-green-500/20 bg-green-500/10 text-green-700 hover:bg-green-500/15`;
  }

  /**
   * Card-body click handler.
   *
   * Ignores clicks that landed on the company link inside the card so that
   * link keeps navigating to the employer page (as in the React `JobCard`).
   */
  onCardClick(event: Event, job: AdminJob): void {
    const origin = event.target;
    if (origin instanceof Element && origin.closest('a')) {
      return;
    }
    this.openJob.emit(job);
  }
}
