import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/admin/admin.service';
import { AdminJob } from '../../core/models/admin';
import { ToastService } from '../../core/toast/toast.service';
import {
  DetailFieldCardComponent,
  FooterActionsDirective,
  IconComponent,
  JobCardComponent,
  MetaBadgeDirective,
  PageContainerComponent,
  SkeletonComponent,
} from '../../shared';
import { formatDateTime, normalizeWebsiteUrl, toCardJob } from './admin-format';

/** Placeholder bars shown while the job loads. */
const SKELETON_ROWS = [1, 2, 3, 4, 5];

/**
 * `/admin/jobs/:jobId`: full job review with verify/unverify and delete.
 *
 * Ports the React `AdminJobDetail`. The backend has no single-job admin
 * route, so `AdminService.job()` resolves the row from `all-jobs`; a job
 * opened from the dashboard is seeded through router state so the page can
 * paint immediately and refresh silently underneath.
 */
@Component({
  selector: 'app-admin-job-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageContainerComponent,
    DetailFieldCardComponent,
    JobCardComponent,
    MetaBadgeDirective,
    FooterActionsDirective,
    IconComponent,
    SkeletonComponent,
    NgClass,
  ],
  template: `
    <app-page-container maxWidthClass="max-w-5xl" contentClassName="space-y-6">
      <div class="page-enter">
        <button
          type="button"
          class="mb-4 text-sm text-text-muted hover:text-[#1F2A24] transition-colors inline-flex items-center gap-2"
          (click)="backToJobs()"
        >
          <app-icon name="arrow-left" [size]="16" /> Back to Jobs
        </button>
        <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-2">
          <app-icon class="text-brand-accent" name="briefcase" [size]="28" /> Job Detail
        </h1>
        <p class="text-text-muted mt-1">
          Review full job metadata and moderate verification state.
        </p>
      </div>

      @if (loading()) {
        <div class="glass-card p-8 space-y-3">
          @for (row of skeletonRows; track row) {
            <app-skeleton variant="row" />
          }
        </div>
      } @else if (job(); as job) {
        @if (cardJob(); as card) {
          <app-job-card [job]="card" [clickable]="false">
            <div metaBadge class="flex items-center gap-2 flex-wrap justify-end">
              <span
                class="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider"
                [ngClass]="job.crn ? 'bg-sky-500/10 text-sky-800 border-sky-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'"
              >
                {{ job.crn ? 'CRN: ' + job.crn : 'CRN: Missing' }}
              </span>
              <span
                class="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider"
                [ngClass]="verifiedBadgeClass(job)"
              >
                {{ job.is_verified ? 'Verified' : 'Unverified' }}
              </span>
              <span
                class="text-[10px] px-2.5 py-1 rounded-full border border-[#E8E3D8] bg-[#FAF8F3] text-text-muted font-bold uppercase tracking-wider"
              >
                {{ job.status ?? 'Unknown' }}
              </span>
            </div>
            <div footerActions class="space-y-3">
              @if (job.skills && job.skills.length > 0) {
                <div class="flex flex-wrap gap-2">
                  @for (skill of job.skills; track skill) {
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
                  [class]="verifyButtonClass(!!job.is_verified)"
                  [disabled]="actionKey() !== null"
                  (click)="onToggleVerification()"
                >
                  @if (job.is_verified) {
                    <app-icon name="undo" [size]="16" class="mr-2" />
                  } @else {
                    <app-icon name="check-circle" [size]="16" class="mr-2" />
                  }
                  {{ actionKey() === 'verify' ? 'Updating...' : job.is_verified ? 'Set Unverified' : 'Set Verified' }}
                </button>
                <button
                  type="button"
                  class="inline-flex items-center justify-center min-w-32 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 text-sm font-bold hover:bg-red-500/15 transition-all disabled:opacity-60"
                  [disabled]="actionKey() !== null"
                  (click)="onDelete()"
                >
                  <app-icon name="trash" [size]="16" class="mr-2" />
                  {{ actionKey() === 'delete' ? 'Deleting...' : 'Delete Job' }}
                </button>
              </div>
            </div>
          </app-job-card>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <app-detail-field-card label="Job ID" [value]="job.job_id" />
            <app-detail-field-card label="Company" [value]="job.company_name ?? 'Unknown'" />
            <app-detail-field-card label="CRN No (Company Registration No)" [value]="job.crn ?? 'Not provided (Unverified)'" />
            <app-detail-field-card label="Location" [value]="job.location ?? 'Not added'" />
            <app-detail-field-card label="Job Type" [value]="job.job_type ?? 'Not specified'" />
            <app-detail-field-card label="Posted" [value]="formatDateTime(job.posted_at)" />
            <div class="rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] p-4 md:col-span-2">
              <p class="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
                Company Website
              </p>
              <div class="text-[#1F2A24] font-medium wrap-break-word">
                @if (companyWebsiteUrl(); as url) {
                  <a
                    [href]="url"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-2 break-all hover:text-brand-accent transition-colors"
                  >
                    <app-icon class="text-brand-accent" name="globe" [size]="16" />
                    {{ job.company_website }}
                  </a>
                } @else {
                  <span class="inline-flex items-center gap-2">
                    <app-icon name="globe" [size]="16" /> Not added
                  </span>
                }
              </div>
            </div>
          </div>

          @if (job.description) {
            <div class="glass-card p-6">
              <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-3">
                Description
              </h3>
              <p class="text-sm text-[#1F2A24]/90 leading-relaxed whitespace-pre-wrap">
                {{ job.description }}
              </p>
            </div>
          }

          <div class="glass-card p-6">
            <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-3">
              Moderation Snapshot
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div
                class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 text-sm text-text-muted inline-flex items-center gap-2"
              >
                <app-icon class="text-brand-accent" name="shield-check" [size]="16" />
                Admin moderation
              </div>
              <div
                class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 text-sm text-text-muted inline-flex items-center gap-2"
              >
                <app-icon [class]="job.crn ? 'text-sky-700' : 'text-red-500'" name="shield-check" [size]="16" />
                CRN: {{ job.crn || 'Missing CRN' }}
              </div>
              <div
                class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 text-sm text-text-muted inline-flex items-center gap-2"
              >
                <app-icon class="text-green-700" name="check-circle" [size]="16" />
                {{ job.is_verified ? 'Verified' : 'Pending verification' }}
              </div>
              <div
                class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 text-sm text-text-muted inline-flex items-center gap-2"
              >
                <app-icon class="text-yellow-700" name="briefcase" [size]="16" />
                {{ job.status ?? 'unknown' }} status
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="glass-card p-8 text-center">
          <p class="text-text-muted">Job not found or unavailable.</p>
        </div>
      }
    </app-page-container>
  `,
})
export class AdminJobDetailPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** The loaded job, `null` before the request resolves or on failure. */
  readonly job = signal<AdminJob | null>(null);

  /** True until the job request settles. */
  readonly loading = signal(true);

  /** Which destructive action is in flight (`verify` / `delete`), if any. */
  readonly actionKey = signal<string | null>(null);

  /** Placeholder bars rendered while loading. */
  readonly skeletonRows = SKELETON_ROWS;

  /** Shared card model for the `JobCard` preview, `null` without a job. */
  readonly cardJob = computed(() => {
    const job = this.job();
    return job ? toCardJob(job) : null;
  });

  /** Website URL with `https://` added, or `null` when not provided. */
  readonly companyWebsiteUrl = computed(() =>
    normalizeWebsiteUrl(this.job()?.company_website),
  );

  /** Date formatting shared with the label helpers. */
  readonly formatDateTime = formatDateTime;

  private readonly jobId = Number(this.route.snapshot.paramMap.get('jobId'));

  /** True when the route carries a usable numeric id. */
  private readonly validJobId = Number.isInteger(this.jobId) && this.jobId > 0;

  constructor() {
    if (!this.validJobId) {
      this.toast.error('Invalid job ID');
      this.router.navigate(['/admin/dashboard'], {
        queryParams: { tab: 'jobs' },
        replaceUrl: true,
      });
      return;
    }

    const state = this.router.getCurrentNavigation()?.extras.state as
      | { job?: AdminJob }
      | undefined;
    const initialJob =
      state?.job && Number(state.job.job_id) === this.jobId ? state.job : null;

    if (initialJob) {
      this.job.set(initialJob);
      this.loading.set(false);
    }
    this.loadJob(initialJob !== null);
  }

  /** Returns to the dashboard's jobs tab. */
  backToJobs(): void {
    this.router.navigate(['/admin/dashboard'], { queryParams: { tab: 'jobs' } });
  }

  /** Flips the verification flag and silently reloads the job. */
  onToggleVerification(): void {
    const job = this.job();
    if (!job) return;

    const nextVerified = !Boolean(job.is_verified);
    this.actionKey.set('verify');
    const request = nextVerified
      ? this.admin.verifyJob(this.jobId)
      : this.admin.unverifyJob(this.jobId);

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(nextVerified ? 'Job verified' : 'Job unverified');
          this.loadJob(true, () => this.actionKey.set(null));
        },
        error: (error: unknown) => {
          this.actionKey.set(null);
          this.toast.error(this.message(error, 'Failed to update verification'));
        },
      });
  }

  /** Deletes the job after confirmation and leaves the page. */
  onDelete(): void {
    const job = this.job();
    if (!job) return;
    if (!window.confirm(`Delete job #${job.job_id}? This cannot be undone.`)) return;

    this.actionKey.set('delete');
    this.admin
      .deleteJob(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Job deleted');
          this.router.navigate(['/admin/dashboard'], {
            queryParams: { tab: 'jobs' },
            replaceUrl: true,
          });
        },
        error: (error: unknown) => {
          this.actionKey.set(null);
          this.toast.error(this.message(error, 'Failed to delete job'));
        },
      });
  }

  /** Yellow "Set Unverified" vs green "Set Verified" button styling. */
  verifyButtonClass(verified: boolean): string {
    const base =
      'inline-flex items-center justify-center min-w-40 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all disabled:opacity-60';
    return verified
      ? `${base} border-yellow-500/20 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/15`
      : `${base} border-green-500/20 bg-green-500/10 text-green-700 hover:bg-green-500/15`;
  }

  /** Green "Verified" vs red "Unverified" pill styling for the card. */
  verifiedBadgeClass(job: AdminJob): string {
    return job.is_verified
      ? 'text-green-700 bg-green-500/10 border-green-500/20'
      : 'text-red-700 bg-red-500/10 border-red-500/20';
  }

  /**
   * Loads the job, backfilling the company website from the employer row
   * when the job itself does not carry one (as the React page does).
   */
  private loadJob(silent: boolean, onComplete?: () => void): void {
    if (!silent) {
      this.loading.set(true);
    }

    this.admin
      .job(this.jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          if (payload.company_website || !payload.employer_id) {
            this.finishLoad(payload, onComplete);
            return;
          }
          this.enrichWithEmployer(payload, onComplete);
        },
        error: (error: unknown) => {
          this.job.set(null);
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load job'));
          onComplete?.();
        },
      });
  }

  /** Falls back to the employer's website when the job has none. */
  private enrichWithEmployer(payload: AdminJob, onComplete?: () => void): void {
    this.admin
      .employers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employers) => {
          const owner = employers.find(
            (employer) => Number(employer.user_id) === Number(payload.employer_id),
          );
          this.finishLoad(
            { ...payload, company_website: owner?.company_website ?? payload.company_website },
            onComplete,
          );
        },
        error: () => {
          // Enrichment is best-effort: the React page shows the job as-is.
          this.finishLoad(payload, onComplete);
        },
      });
  }

  /** Publishes the loaded job and stops the skeleton. */
  private finishLoad(job: AdminJob, onComplete?: () => void): void {
    this.job.set(job);
    this.loading.set(false);
    onComplete?.();
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
