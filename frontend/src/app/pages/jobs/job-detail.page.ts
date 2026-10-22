import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { JobsService } from '../../core/jobs/jobs.service';
import { Job } from '../../core/models/job';
import { JobMatch } from '../../core/models/seeker';
import { assetUrl } from '../../core/http/asset-url';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import {
  IconComponent,
  JobMatchCircleComponent,
  JobTypePipe,
  PageContainerComponent,
  StatusBadgeComponent,
  DatePipe,
} from '../../shared';

/** Fallback company avatar when a job carries no logo (as in React). */
const DEFAULT_LOGO = '/logos/google.png';

/** Placeholder bars shown while the job request is in flight. */
const SKELETONS = [1, 2, 3, 4, 5];

/**
 * `/jobs/:jobId` — full posting detail.
 *
 * Port of the React `JobDetail`: header card with apply/save actions, the
 * summary tile row (four tiles, plus the match gauge for seekers), description,
 * required skills and — for seekers — the matched/missing skill breakdown.
 */
@Component({
  selector: 'app-job-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    JobMatchCircleComponent,
    JobTypePipe,
    PageContainerComponent,
    StatusBadgeComponent,
    DatePipe,
  ],
  template: `
    <app-page-container>
      <div>
        <button
          type="button"
          (click)="goBack()"
          class="mb-4 text-sm text-text-muted hover:text-[#1F2A24] transition-colors inline-flex items-center gap-2"
        >
          <app-icon name="arrow-left" [size]="16" />
          Back to Explore Jobs
        </button>

        @if (loading()) {
          <div class="glass-card p-8 space-y-3">
            @for (skeleton of skeletons; track skeleton) {
              <div class="h-12 rounded-xl bg-[#F1EDE4] animate-pulse"></div>
            }
          </div>
        } @else {
          @if (job(); as currentJob) {
            <div class="space-y-6">
              <div class="glass-card p-8">
                <div class="flex items-start justify-between gap-4 flex-wrap lg:flex-nowrap">
                  <div class="flex items-start gap-4">
                    <div
                      class="w-16 h-16 rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] overflow-hidden shrink-0"
                    >
                      <img
                        [src]="logoSrc()"
                        [alt]="(currentJob.company || 'Company') + ' logo'"
                        class="w-full h-full object-cover"
                        referrerpolicy="no-referrer"
                        (error)="useFallbackLogo()"
                      />
                    </div>
                    <div>
                      <h1
                        class="text-3xl font-display font-bold text-[#1F2A24] inline-flex items-center gap-2"
                      >
                        <app-icon name="briefcase" [size]="28" />
                        {{ currentJob.title }}
                      </h1>
                      <a
                        [routerLink]="['/employers', currentJob.employerId ?? currentJob.id]"
                        [queryParams]="{ jobId: currentJob.id }"
                        class="mt-2 text-brand-accent font-semibold inline-flex items-center gap-2 transition-colors hover:text-[#1F2A24]"
                      >
                        <app-icon name="building" [size]="16" />
                        {{ currentJob.company }}
                      </a>

                      <div class="mt-3 flex items-center gap-2 flex-wrap w-full">
                        <app-status-badge variant="job" [value]="currentJob.status ?? 'open'" />
                        <app-status-badge
                          variant="verification"
                          [value]="verificationValue(currentJob)"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    class="w-full lg:w-auto lg:min-w-[320px] flex flex-col items-start lg:items-end gap-3"
                  >
                    @if (isSeeker()) {
                      <div class="flex items-center justify-end gap-2 w-full">
                        <button
                          type="button"
                          (click)="onApply()"
                          [disabled]="applyDisabled()"
                          [attr.aria-disabled]="isJobClosed()"
                          [class]="applyClass()"
                        >
                          {{ applyLabel() }}
                          @if (showAppliedIcon()) {
                            <app-icon name="check-circle" [size]="14" />
                          }
                        </button>
                        <button
                          type="button"
                          (click)="onToggleSave()"
                          [disabled]="saving() || checkingSaved()"
                          [class]="saveClass()"
                        >
                          {{ saveLabel() }}
                          @if (!saving()) {
                            <app-icon name="bookmark" [size]="14" />
                          }
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div [class]="tilesGridClass()">
                <div class="glass-card p-5">
                  <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                    Job Type
                  </p>
                  <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                    <app-icon name="calendar" [size]="16" />
                    {{ currentJob.type | jobType }}
                  </p>
                </div>

                <div class="glass-card p-5">
                  <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                    Location
                  </p>
                  <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                    <app-icon name="map-pin" [size]="16" />
                    {{ currentJob.location || 'Remote' }}
                  </p>
                </div>

                <div class="glass-card p-5">
                  <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                    Compensation
                  </p>
                  <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                    <app-icon name="dollar-sign" [size]="16" />
                    {{ currentJob.salary }}
                  </p>
                </div>

                <div class="glass-card p-5">
                  <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                    Posted
                  </p>
                  <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                    <app-icon name="calendar" [size]="16" />
                    {{ currentJob.postedAt | appDate }}
                  </p>
                </div>

                @if (isSeeker()) {
                  <div class="glass-card p-5 flex flex-col items-center justify-center">
                    @if (loadingMatch()) {
                      <div class="space-y-2 text-center">
                        <div class="w-20 h-20 rounded-full bg-[#F1EDE4] animate-pulse mx-auto"></div>
                        <p class="text-xs text-text-muted">Calculating...</p>
                      </div>
                    } @else if (jobMatch(); as match) {
                      <app-job-match-circle
                        [matchPercentage]="match.match_percentage"
                        [size]="92"
                        [strokeWidth]="7"
                      />
                      <p class="mt-2 text-xs text-text-muted text-center">
                        {{ match.matched_skills.length }}/{{ totalSkills() }} skills matched
                      </p>
                    } @else {
                      <p class="text-xs text-text-muted text-center">Match unavailable</p>
                    }
                  </div>
                }
              </div>

              <div class="glass-card p-8">
                <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-4">Job Description</h2>
                <p class="text-text-main leading-relaxed whitespace-pre-wrap">
                  {{ currentJob.description || 'No job description has been provided.' }}
                </p>
              </div>

              <div class="glass-card p-8">
                <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-4">
                  Required Skills
                </h2>
                @if (skillList(currentJob).length === 0) {
                  <p class="text-text-muted">No specific skill requirements listed.</p>
                } @else {
                  <div class="flex flex-wrap gap-2">
                    @for (skill of skillList(currentJob); track $index) {
                      <span
                        class="px-3 py-1.5 rounded-full border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold"
                      >
                        {{ skill }}
                      </span>
                    }
                  </div>
                }
              </div>

              @if (isSeeker()) {
                @if (jobMatch(); as match) {
                  <div class="glass-card p-8">
                    <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-4">
                      Skill Match Breakdown
                    </h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-3">
                          Matched Skills ({{ match.matched_skills.length }})
                        </p>
                        @if (match.matched_skills.length === 0) {
                          <p class="text-sm text-text-muted">No matched skills yet.</p>
                        } @else {
                          <div class="flex flex-wrap gap-2">
                            @for (skill of match.matched_skills; track $index) {
                              <span
                                class="px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/10 text-green-700 text-xs font-bold"
                              >
                                {{ skill }}
                              </span>
                            }
                          </div>
                        }
                      </div>

                      <div>
                        <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-3">
                          Missing Skills ({{ match.missing_skills.length }})
                        </p>
                        @if (match.missing_skills.length === 0) {
                          <p class="text-sm text-green-700">You match all listed skills.</p>
                        } @else {
                          <div class="flex flex-wrap gap-2">
                            @for (skill of match.missing_skills; track $index) {
                              <span
                                class="px-3 py-1.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-700 text-xs font-bold"
                              >
                                {{ skill }}
                              </span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          } @else {
            <div class="glass-card p-8 text-center">
              <p class="text-text-muted">Job not found or unavailable.</p>
            </div>
          }
        }
      </div>
    </app-page-container>
  `,
})
export class JobDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsService = inject(JobsService);
  private readonly seekerService = inject(SeekerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Loaded posting, or `null` while loading / after a failed request. */
  readonly job = signal<Job | null>(null);

  /** True until the job request settles. */
  readonly loading = signal(true);

  /** Seeker-only saved/applied state for this posting. */
  readonly isSaved = signal(false);
  readonly isApplied = signal(false);
  readonly checkingSaved = signal(false);
  readonly checkingApplied = signal(false);
  readonly saving = signal(false);
  readonly applying = signal(false);

  /** Skill match for the signed-in seeker, when one could be calculated. */
  readonly jobMatch = signal<JobMatch | null>(null);
  readonly loadingMatch = signal(false);

  /** Skeleton bar indices rendered while the job loads. */
  readonly skeletons = SKELETONS;

  /** Apply/save actions only exist for signed-in job seekers. */
  readonly isSeeker = computed(() => this.auth.user()?.role === 'jobseeker');

  /** Closed postings cannot be applied to. */
  readonly isJobClosed = computed(
    () => String(this.job()?.status ?? '').toLowerCase() === 'closed',
  );

  /** Disables the apply button while busy or once applied. */
  readonly applyDisabled = computed(
    () => this.applying() || this.checkingApplied() || this.isApplied(),
  );

  /** Matched + missing skills, i.e. the denominator of the gauge read-out. */
  readonly totalSkills = computed(() => {
    const match = this.jobMatch();
    return match ? match.matched_skills.length + match.missing_skills.length : 0;
  });

  /** Logo with the shared fallback applied, forced after a broken image. */
  readonly logoSrc = computed(() =>
    this.logoFailed() ? DEFAULT_LOGO : assetUrl(this.job()?.logo) || DEFAULT_LOGO,
  );

  /** Tile row gains a fifth column (the match gauge) for seekers. */
  readonly tilesGridClass = computed(() =>
    this.isSeeker() ? 'grid grid-cols-1 md:grid-cols-5 gap-4' : 'grid grid-cols-1 md:grid-cols-4 gap-4',
  );

  /** Set once the job logo (or its fallback) failed to load. */
  private readonly logoFailed = signal(false);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const jobId = Number(params.get('jobId'));
      if (!Number.isInteger(jobId) || jobId <= 0) {
        this.toast.error('Invalid job ID');
        void this.router.navigate(['/explore-jobs'], { replaceUrl: true });
        return;
      }
      this.loadJob(jobId);
    });
  }

  /** Job skills, defaulting to an empty list for postings without any. */
  skillList(job: Job): string[] {
    return Array.isArray(job.skills) ? job.skills : [];
  }

  /** Badge value spelling the verification flag for `StatusBadgeComponent`. */
  verificationValue(job: Job): string {
    return String(job.isVerified ?? false);
  }

  /** Submits an application for a still-open posting. */
  onApply(): void {
    const job = this.job();
    if (!this.isSeeker() || !job || this.isApplied()) {
      return;
    }
    if (String(job.status ?? '').toLowerCase() === 'closed') {
      this.toast.error('Job is closed');
      return;
    }

    this.applying.set(true);
    this.seekerService
      .apply(job.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.applying.set(false);
          this.isApplied.set(true);
          this.toast.success('Application submitted.');
        },
        error: (error: unknown) => {
          this.applying.set(false);
          this.toast.error(this.message(error, 'Failed to apply for job'));
        },
      });
  }

  /** Saves the posting, or removes it from the saved list. */
  onToggleSave(): void {
    const job = this.job();
    if (!this.isSeeker() || !job) {
      return;
    }

    const alreadySaved = this.isSaved();
    this.saving.set(true);
    const request = alreadySaved
      ? this.seekerService.removeSavedJob(job.id)
      : this.seekerService.saveJob(job.id);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.isSaved.set(!alreadySaved);
        this.toast.success(alreadySaved ? 'Removed from saved jobs.' : 'Job saved.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.toast.error(this.message(error, 'Failed to update saved jobs'));
      },
    });
  }

  /** Returns to the job catalogue. */
  goBack(): void {
    void this.router.navigate(['/explore-jobs']);
  }

  /** Swaps a broken logo for the shared fallback (once). */
  useFallbackLogo(): void {
    this.logoFailed.set(true);
  }

  /** Styling matrix for the apply button (closed/applied/available). */
  applyClass(): string {
    const base =
      'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border text-xs font-extrabold tracking-wide transition-all disabled:opacity-60';
    if (this.isJobClosed()) {
      return `${base} border-[#D8D2C4] bg-[#F1EDE4] text-text-muted cursor-not-allowed hover:bg-[#F1EDE4]`;
    }
    if (this.isApplied()) {
      return `${base} border-green-500/20 bg-green-500/10 text-green-700 hover:bg-green-500/15`;
    }
    return `${base} border-brand-accent bg-brand-accent text-white hover:bg-brand-accent-hover`;
  }

  /** Styling matrix for the save button (saved/unsaved). */
  saveClass(): string {
    const base =
      'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border text-xs font-extrabold tracking-wide transition-all disabled:opacity-60';
    return this.isSaved()
      ? `${base} border-yellow-500/20 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/15`
      : `${base} border-[#D8D2C4] bg-white text-[#1F2A24] hover:border-yellow-500/40 hover:text-yellow-700`;
  }

  /** Button copy for the apply button across all of its states. */
  applyLabel(): string {
    if (this.isJobClosed()) {
      return 'Apply (Closed)';
    }
    if (this.applying()) {
      return 'Applying...';
    }
    return this.isApplied() ? 'Applied' : 'Apply';
  }

  /** Shows the confirmation glyph only on the settled "applied" state. */
  showAppliedIcon(): boolean {
    return this.isApplied() && !this.isJobClosed() && !this.applying();
  }

  /** Button copy for the save button across all of its states. */
  saveLabel(): string {
    if (this.saving()) {
      return 'Saving...';
    }
    return this.isSaved() ? 'Saved' : 'Save';
  }

  /** Loads the posting and, for seekers, its saved/applied flags and match. */
  private loadJob(jobId: number): void {
    this.loading.set(true);
    this.job.set(null);
    this.logoFailed.set(false);

    this.jobsService
      .jobById(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (job) => {
          this.job.set(job);
          this.loading.set(false);
          if (this.isSeeker()) {
            this.loadSavedAndApplied(job.id);
            this.loadMatch(job.id);
          }
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load job details'));
        },
      });
  }

  /** Reads the seeker's saved list and applications once the job is known. */
  private loadSavedAndApplied(jobId: number): void {
    this.checkingSaved.set(true);
    this.checkingApplied.set(true);

    forkJoin({
      saved: this.seekerService.savedJobs(),
      applied: this.seekerService.applications(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ saved, applied }) => {
          this.checkingSaved.set(false);
          this.checkingApplied.set(false);
          this.isSaved.set(saved.some((item) => Number(item.job_id) === jobId));
          this.isApplied.set(applied.some((item) => Number(item.job_id) === jobId));
        },
        error: (error: unknown) => {
          this.checkingSaved.set(false);
          this.checkingApplied.set(false);
          this.toast.error(this.message(error, 'Failed to fetch job actions'));
        },
      });
  }

  /** Fetches the seeker's skill match for the current posting. */
  private loadMatch(jobId: number): void {
    this.loadingMatch.set(true);
    this.seekerService
      .jobMatch(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (match) => {
          this.loadingMatch.set(false);
          this.jobMatch.set(match);
        },
        error: (error: unknown) => {
          this.loadingMatch.set(false);
          this.jobMatch.set(null);
          this.toast.error(this.message(error, 'Failed to calculate job match'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
