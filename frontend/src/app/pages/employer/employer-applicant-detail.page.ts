import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmployerService } from '../../core/employer/employer.service';
import { assetUrl } from '../../core/http/asset-url';
import { EmployerApplicant, EmployerJob } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import {
  DetailFieldCardComponent,
  IconComponent,
  PageContainerComponent,
  SkeletonComponent,
  StatusBadgeComponent,
} from '../../shared';

/** Statuses offered by the pipeline control. */
const STATUSES = ['applied', 'shortlisted', 'rejected', 'hired'] as const;

type ApplicationStatus = (typeof STATUSES)[number];

/** Row shape: the applicant plus the posting it belongs to. */
type ApplicantRow = EmployerApplicant & { job_id: number; job_title: string };

/** Unknown or legacy statuses fall back to `applied`, like React's `normalizeStatus`. */
function normalizeStatus(value: string | undefined): ApplicationStatus {
  const lowered = String(value ?? '').toLowerCase();
  return (STATUSES as readonly string[]).includes(lowered)
    ? (lowered as ApplicationStatus)
    : 'applied';
}

/** One required job skill and whether the candidate covers it. */
type SkillComparison = { name: string; proficiency: string | null };

/**
 * `/employer/applications/:applicationId`: one candidate's full profile.
 *
 * The row is seeded from the list page's router state when present (React's
 * `location.state.application`) so navigating from a table is instant; a
 * bookmarked URL falls back to the aggregated applicant list, keeping the deep
 * link working without a single-application endpoint. The job's required
 * skills come from `my-jobs`, which powers the matched/missing comparison.
 */
@Component({
  selector: 'app-employer-applicant-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageContainerComponent,
    DetailFieldCardComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    IconComponent,
    TitleCasePipe,
  ],
  template: `
    <app-page-container contentClassName="space-y-6">
      <header class="page-enter">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
        <h1
          class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24] flex items-center gap-2"
        >
          <app-icon name="user" [size]="28" class="text-brand-accent" /> Applicant Detail
        </h1>
        <p class="mt-3 text-text-muted">
          Detailed information for the selected application.
        </p>
        <a
          routerLink="/employer/applications"
          class="mt-3 inline-flex items-center gap-2 text-sm font-bold text-text-muted hover:text-[#1F2A24] transition-colors"
        >
          <app-icon name="arrow-left" [size]="16" /> Back to Applications
        </a>
      </header>

      @if (loading()) {
        <div class="glass-card p-8 space-y-4">
          @for (row of rows; track row) {
            <app-skeleton variant="text" />
          }
        </div>
      } @else if (error()) {
        <div class="glass-card p-8 text-center text-red-500">{{ error() }}</div>
      } @else if (applicant(); as current) {
        <section class="glass-card p-6 space-y-6">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-4">
              <div
                class="w-14 h-14 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-brand-accent font-bold flex items-center justify-center overflow-hidden shrink-0"
              >
                @if (avatarSrc(); as avatar) {
                  <img
                    [src]="avatar"
                    [alt]="current.seeker.full_name || 'Applicant avatar'"
                    class="w-full h-full object-cover"
                    referrerpolicy="no-referrer"
                  />
                } @else {
                  {{ initial(current.seeker.full_name) }}
                }
              </div>
              <div>
                <h2 class="text-2xl font-display font-bold text-[#1F2A24]">
                  {{ current.seeker.full_name || 'Unknown Candidate' }}
                </h2>
                <p class="text-text-muted mt-1 inline-flex items-center gap-2">
                  <app-icon name="briefcase" [size]="16" />
                  {{ current.job_title || 'Untitled Job' }}
                </p>
              </div>
            </div>
            <app-status-badge variant="application" [value]="current.application_status" />
          </div>

          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <app-detail-field-card label="Application ID" [value]="current.application_id" />
            <app-detail-field-card label="Applied At" [value]="dateTime(current.applied_at)" />
            <app-detail-field-card
              label="Education"
              [value]="current.seeker.education || 'Not provided'"
            />
            <app-detail-field-card
              label="Phone"
              [value]="current.seeker.phone_number || 'Not provided'"
            />
            <app-detail-field-card
              label="Experience"
              [value]="(current.seeker.experience_years ?? 0) + ' years'"
            />
            <app-detail-field-card label="Job ID" [value]="current.job_id" />
          </div>

          <div class="rounded-xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
            <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-4 inline-flex items-center gap-2">
              <app-icon name="shield-check" [size]="16" class="text-brand-accent" />
              Update Application Status
            </h3>

            <div class="flex flex-wrap items-center gap-3">
              <label for="applicant-status" class="sr-only">Application status</label>
              <select
                id="applicant-status"
                class="input-field h-12 w-48 capitalize"
                [value]="statusDraft()"
                [disabled]="savingStatus()"
                (change)="onStatusDraftChange($event)"
              >
                @for (status of statuses; track status) {
                  <option [value]="status">{{ status | titlecase }}</option>
                }
              </select>

              <button
                type="button"
                (click)="saveStatus()"
                [disabled]="savingStatus()"
                class="btn-primary px-5 py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {{ savingStatus() ? 'Updating…' : 'Save Status' }}
              </button>
            </div>
          </div>

          <div class="rounded-xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
            <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-4 inline-flex items-center gap-2">
              <app-icon name="file-text" [size]="16" class="text-brand-accent" />
              Resume
            </h3>

            @if (current.seeker.resume_url) {
              <button
                type="button"
                (click)="download()"
                [disabled]="downloading()"
                class="inline-flex items-center gap-2 btn-primary px-5 py-3 rounded-xl text-sm disabled:opacity-60"
              >
                <app-icon name="file-text" [size]="16" />
                {{ downloading() ? 'Preparing…' : 'Download Resume' }}
              </button>
            } @else {
              <p class="text-sm text-text-muted">Resume is not available for this applicant.</p>
            }
          </div>

          <div class="rounded-xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
            <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-4 inline-flex items-center gap-2">
              <app-icon name="zap" [size]="16" class="text-brand-accent" />
              Skills
            </h3>

            @if ((current.seeker.skills ?? []).length === 0) {
              <p class="text-sm text-text-muted">No skills listed.</p>
            } @else {
              <div class="flex flex-wrap gap-2">
                @for (skill of current.seeker.skills ?? []; track skill.name) {
                  <span
                    class="px-3 py-1 rounded-full border border-[#D8D2C4] bg-white text-xs text-[#1F2A24]"
                  >
                    {{ skill.name || 'Skill' }}
                    @if (skill.proficiency) {
                      ({{ skill.proficiency }})
                    }
                  </span>
                }
              </div>
            }
          </div>

          <div class="rounded-xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
            <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-4 inline-flex items-center gap-2">
              <app-icon name="shield-check" [size]="16" class="text-brand-accent" />
              Required vs Applicant Skills
            </h3>

            @if (requiredSkills().length === 0) {
              <p class="text-sm text-text-muted">
                Required job skills are not available for comparison.
              </p>
            } @else {
              <div class="grid sm:grid-cols-2 gap-4">
                <div class="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                  <p class="text-xs font-bold uppercase tracking-widest text-[#2E4A38] mb-3">
                    Matched ({{ comparison().matched.length }})
                  </p>
                  @if (comparison().matched.length === 0) {
                    <p class="text-sm text-text-muted">No matched required skills.</p>
                  } @else {
                    <div class="flex flex-wrap gap-2">
                      @for (skill of comparison().matched; track skill.name) {
                        <span
                          class="px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-xs text-[#2E4A38]"
                        >
                          {{ skill.name }}
                          @if (skill.proficiency) {
                            ({{ skill.proficiency }})
                          }
                        </span>
                      }
                    </div>
                  }
                </div>

                <div class="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p class="text-xs font-bold uppercase tracking-widest text-red-600 mb-3">
                    Missing ({{ comparison().missing.length }})
                  </p>
                  @if (comparison().missing.length === 0) {
                    <p class="text-sm text-text-muted">Applicant covers all required skills.</p>
                  } @else {
                    <div class="flex flex-wrap gap-2">
                      @for (skill of comparison().missing; track skill.name) {
                        <span
                          class="px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-xs text-red-600"
                        >
                          {{ skill.name }}
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <a
              [routerLink]="['/employer/applications/job', current.job_id]"
              [state]="{ jobTitle: current.job_title }"
              class="block mt-5 text-sm font-bold text-text-muted hover:text-[#D4622A] transition-colors"
            >
              View all applicants for this job →
            </a>
          </div>
        </section>
      }
    </app-page-container>
  `,
})
export class EmployerApplicantDetailPage {
  private readonly employerService = inject(EmployerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly applicationId = Number(this.route.snapshot.paramMap.get('applicationId'));

  private readonly applicantState = signal<ApplicantRow | null>(null);

  /** Posting skills used by the matched/missing comparison. */
  readonly requiredSkills = signal<string[]>([]);

  readonly applicant = this.applicantState.asReadonly();

  /** Applicant photo resolved for the `<img>` (see `assetUrl`). */
  readonly avatarSrc = computed(() => assetUrl(this.applicant()?.seeker.avatar_url));
  readonly loading = signal(true);
  readonly error = signal('');

  /** Draft picked in the select — only sent when *Save Status* is pressed. */
  readonly statusDraft = signal<ApplicationStatus>('applied');
  readonly savingStatus = signal(false);
  readonly downloading = signal(false);

  readonly statuses = STATUSES;
  readonly rows = [1, 2, 3, 4];

  /** Pairs each required skill with the candidate's proficiency, or `null`. */
  readonly comparison = computed(() => {
    const applicant = this.applicantState();
    const known = new Map<string, string>();
    for (const skill of applicant?.seeker.skills ?? []) {
      const key = (skill.name ?? '').trim().toLowerCase();
      if (key) known.set(key, skill.proficiency ?? '');
    }

    const matched: SkillComparison[] = [];
    const missing: SkillComparison[] = [];
    for (const name of this.requiredSkills()) {
      const proficiency = known.get(name.trim().toLowerCase());
      if (proficiency !== undefined) {
        matched.push({ name, proficiency: proficiency || null });
      } else {
        missing.push({ name, proficiency: null });
      }
    }
    return { matched, missing };
  });

  constructor() {
    const seeded = this.readRouterState();

    if (seeded) {
      this.applicantState.set(seeded);
      this.statusDraft.set(normalizeStatus(seeded.application_status));
      this.loading.set(false);
      this.loadRequiredSkills(seeded.job_id);
      return;
    }

    if (!Number.isInteger(this.applicationId) || this.applicationId <= 0) {
      this.toast.error('Invalid application ID');
      void this.router.navigate(['/employer/applications'], { replaceUrl: true });
      return;
    }

    this.employerService
      .allApplicants()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          const match = rows.find((row) => row.application_id === this.applicationId) ?? null;
          if (!match) {
            this.error.set('Application not found.');
          }
          this.applicantState.set(match);
          this.statusDraft.set(normalizeStatus(match?.application_status));
          this.loading.set(false);
          if (match) this.loadRequiredSkills(match.job_id);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.message(error, 'Failed to fetch applicant detail'));
        },
      });
  }

  /** React's `setStatus` — updates the draft only. */
  onStatusDraftChange(event: Event): void {
    this.statusDraft.set(
      (event.target as HTMLSelectElement).value as (typeof STATUSES)[number],
    );
  }

  /** `PATCH /api/employer/application-status/:id` — explicit save, like React. */
  saveStatus(): void {
    const current = this.applicantState();
    if (!current || this.savingStatus()) return;

    const draft = this.statusDraft();
    if (draft === normalizeStatus(current.application_status)) {
      this.toast.success('Status is already up to date');
      return;
    }

    this.savingStatus.set(true);
    this.employerService
      .updateApplicationStatus(current.application_id, { status: draft })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingStatus.set(false);
          this.applicantState.update((row) =>
            row ? { ...row, application_status: draft } : row,
          );
          this.toast.success('Application status updated');
        },
        error: (error: unknown) => {
          this.savingStatus.set(false);
          this.toast.error(this.message(error, 'Failed to update application status'));
        },
      });
  }

  /**
   * Streams the resume as an authenticated blob: `resume_url` points at
   * `/api/auth/resume-download/:id`, which the global JWT guard protects, so
   * the service builds the absolute URL and attaches the bearer header.
   */
  download(): void {
    this.downloading.set(true);
    this.employerService
      .downloadResume(this.applicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.downloading.set(false);
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `resume-${this.applicationId}.pdf`;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: (error: unknown) => {
          this.downloading.set(false);
          this.toast.error(this.message(error, 'Failed to download resume'));
        },
      });
  }

  /** First letter of the candidate's name, or `A` when none is known. */
  initial(name: string | null): string {
    return (name ?? 'A').trim().charAt(0).toUpperCase() || 'A';
  }

  /** Long date-time for the "Applied At" card. */
  dateTime(value: string | Date | undefined): string {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
  }

  /** React's `location.state.application`, validated against the route id. */
  private readRouterState(): ApplicantRow | null {
    const state = this.router.getCurrentNavigation()?.extras.state as
      | { application?: ApplicantRow }
      | null;
    const application = state?.application;
    if (application && Number(application.application_id) === this.applicationId) {
      return application;
    }
    return null;
  }

  /** `GET /api/employer/my-jobs` → the posting's required skill list. */
  private loadRequiredSkills(jobId: number): void {
    if (!Number.isInteger(jobId) || jobId <= 0) {
      this.requiredSkills.set([]);
      return;
    }

    this.employerService
      .myJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs: EmployerJob[]) => {
          const job = jobs.find((item) => Number(item.job_id) === Number(jobId));
          this.requiredSkills.set(
            (job?.skills ?? [])
              .map((item) => String(item ?? '').trim())
              .filter((item) => item.length > 0),
          );
        },
        error: () => this.requiredSkills.set([]),
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
