import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
import { JobsService } from '../../core/jobs/jobs.service';
import { assetUrl } from '../../core/http/asset-url';
import { Job } from '../../core/models/job';
import { CompanyDetails } from '../../core/models/seeker';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent, JobCardComponent, PageContainerComponent } from '../../shared';

/** Fallback company avatar when neither the employer nor a job carries one. */
const DEFAULT_LOGO = '/logos/google.png';

/** Detail-tile placeholders shown while the page loads. */
const TILE_SKELETONS = [1, 2, 3, 4, 5];

/** Job-card placeholders shown while the page loads. */
const CARD_SKELETONS = [1, 2, 3, 4, 5, 6];

/** Adds a scheme to a bare host so the website link is always navigable. */
function normalizeWebsiteUrl(website?: string | null): string | null {
  const trimmed = (website ?? '').trim();
  if (!trimmed) {
    return null;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * `/employers/:employerId` — company profile plus its published postings.
 *
 * Port of the React `EmployerDetail`: honours the `?jobId=` query param by
 * resolving the employer behind that posting first, then renders the header,
 * the five detail tiles and the employer's job grid.
 */
@Component({
  selector: 'app-employer-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, JobCardComponent, PageContainerComponent],
  template: `
    <app-page-container maxWidthClass="max-w-7xl" contentClassName="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-start gap-4">
          <div
            class="w-16 h-16 rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] overflow-hidden shrink-0"
          >
            <img
              [src]="companyLogo()"
              [alt]="companyName() + ' logo'"
              class="w-full h-full object-cover"
              referrerpolicy="no-referrer"
              (error)="useFallbackLogo()"
            />
          </div>
          <div>
            <button
              type="button"
              (click)="goBack()"
              class="mb-4 text-sm text-text-muted hover:text-[#1F2A24] transition-colors inline-flex items-center gap-2"
            >
              <app-icon name="arrow-left" [size]="16" />
              Back to Explore Jobs
            </button>
            <h1
              class="text-3xl font-display font-bold text-[#1F2A24] inline-flex items-center gap-2"
            >
              <app-icon name="building" [size]="28" />
              {{ companyName() }}
            </h1>
            <p class="text-text-muted mt-1">{{ tagline() }}</p>
          </div>
        </div>
        <span
          class="inline-flex items-center px-3 py-1 rounded-full border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase tracking-widest"
        >
          {{ loading() ? 'Loading...' : jobs().length + ' active jobs' }}
        </span>
      </div>

      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6">Employer Details</h2>

        @if (loading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            @for (tile of tileSkeletons; track tile) {
              <div class="h-32 rounded-2xl bg-[#F1EDE4] animate-pulse"></div>
            }
          </div>
        } @else if (employerDetails(); as details) {
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
              <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                CRN No
              </p>
              <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                <app-icon name="shield-check" [size]="16" class="text-brand-accent" />
                {{ details.crn || 'Unregistered' }}
              </p>
            </div>
            <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
              <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                Industry
              </p>
              <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                <app-icon name="zap" [size]="16" />
                {{ details.industry || 'Not specified' }}
              </p>
            </div>
            <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
              <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                Team Size
              </p>
              <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                <app-icon name="users" [size]="16" />
                {{ details.company_size || 'Not specified' }}
              </p>
            </div>
            <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
              <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                Location
              </p>
              <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                <app-icon name="map-pin" [size]="16" />
                {{ details.company_location || 'Not specified' }}
              </p>
            </div>
            <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
              <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                Contact
              </p>
              <p class="text-[#1F2A24] font-medium inline-flex items-center gap-2">
                <app-icon name="phone" [size]="16" />
                {{ details.company_phone || 'Not available' }}
              </p>
            </div>
            <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
              <p class="text-xs uppercase tracking-widest text-text-muted font-bold mb-2">
                Website
              </p>
              @if (companyWebsite()) {
                <a
                  [href]="companyWebsite()"
                  target="_blank"
                  rel="noreferrer"
                  class="text-brand-accent hover:text-[#1F2A24] transition-colors text-sm inline-flex items-center gap-2"
                >
                  <app-icon name="globe" [size]="16" />
                  Visit Website
                </a>
              } @else {
                <p class="text-text-muted text-sm inline-flex items-center gap-2">
                  <app-icon name="globe" [size]="16" />
                  No website listed
                </p>
              }
            </div>
          </div>
        } @else {
          <p class="text-sm text-text-muted">
            Employer profile details are unavailable for this job.
          </p>
        }
      </div>

      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6">
          Jobs Posted By This Employer
        </h2>

        @if (loading()) {
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (card of cardSkeletons; track card) {
              <div class="h-56 rounded-2xl bg-[#F1EDE4] animate-pulse"></div>
            }
          </div>
        } @else if (jobs().length === 0) {
          <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-10 text-center">
            <div class="mb-3 flex justify-center text-text-muted">
              <app-icon name="briefcase" [size]="40" />
            </div>
            <p class="text-text-muted mt-3">
              No active verified jobs are available for this employer right now.
            </p>
          </div>
        } @else {
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (job of jobs(); track job.id) {
              <app-job-card [job]="job" />
            }
          </div>
        }
      </div>
    </app-page-container>
  `,
})
export class EmployerDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsService = inject(JobsService);
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Company record resolved through the optional `?jobId=` reference. */
  readonly employerDetails = signal<CompanyDetails | null>(null);

  /** Postings published by the resolved employer. */
  readonly jobs = signal<Job[]>([]);

  /** True until both the details and job requests settle. */
  readonly loading = signal(true);

  /** Detail-tile placeholder indices. */
  readonly tileSkeletons = TILE_SKELETONS;

  /** Job-card placeholder indices. */
  readonly cardSkeletons = CARD_SKELETONS;

  /** Company name, falling back to the first job and finally "Employer". */
  readonly companyName = computed(() => {
    const details = this.employerDetails();
    return details?.company_name || this.jobs()[0]?.company || 'Employer';
  });

  /** Sub-title under the company name, seeded by the industry when known. */
  readonly tagline = computed(() => {
    const industry = this.employerDetails()?.industry;
    return industry
      ? `${industry} employer with open verified jobs.`
      : 'Open verified jobs published by this employer.';
  });

  /** Normalized external site, or `null` when none is listed. */
  readonly companyWebsite = computed(() =>
    normalizeWebsiteUrl(this.employerDetails()?.company_website),
  );

  /** Company avatar with the shared fallback applied. */
  readonly companyLogo = computed(() =>
    this.logoFailed()
      ? DEFAULT_LOGO
      : assetUrl(this.employerDetails()?.logo_url || this.jobs()[0]?.logo) || DEFAULT_LOGO,
  );

  /** Set once the company logo (or its fallback) failed to load. */
  private readonly logoFailed = signal(false);

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => {
        const employerId = Number(params.get('employerId'));
        if (!Number.isInteger(employerId) || employerId <= 0) {
          this.toast.error('Invalid employer ID');
          void this.router.navigate(['/explore-jobs'], { replaceUrl: true });
          return;
        }

        const rawJobRef = Number(query.get('jobId'));
        const jobId = Number.isInteger(rawJobRef) && rawJobRef > 0 ? rawJobRef : null;
        this.loadPage(employerId, jobId);
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

  /**
   * Loads the employer record (when a `jobId` reference was supplied) and then
   * the employer's jobs, mirroring the React page's two-step effect.
   */
  private loadPage(employerId: number, jobId: number | null): void {
    this.loading.set(true);
    this.logoFailed.set(false);

    const details$ =
      jobId === null
        ? of(null)
        : this.seekerService.employerOfJob(jobId).pipe(catchError(() => of(null)));

    details$
      .pipe(
        switchMap((details) =>
          this.jobsService.publicJobs().pipe(
            map((jobs) => ({
              details,
              jobs: jobs.filter((job) => this.matchesEmployer(job, employerId, details)),
            })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ details, jobs }) => {
          this.employerDetails.set(details);
          this.jobs.set(jobs);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.employerDetails.set(null);
          this.jobs.set([]);
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load employer jobs'));
        },
      });
  }

  /**
   * Prefers the employer id carried by the resolved details (as React does),
   * falling back to the id taken from the route.
   */
  private matchesEmployer(job: Job, employerId: number, details: CompanyDetails | null): boolean {
    const detailId = Number(details?.employer_id);
    const resolved = Number.isInteger(detailId) && detailId > 0 ? detailId : employerId;
    return Number(job.employerId) === resolved;
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
