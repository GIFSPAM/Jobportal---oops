import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EmployerService } from '../../core/employer/employer.service';
import { assetUrl } from '../../core/http/asset-url';
import { EmployerJob, EmployerProfile, EmployerStats } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import {
  IconComponent,
  JobTypePipe,
  PageContainerComponent,
  SkeletonComponent,
  StatCardComponent,
  StatusBadgeComponent,
} from '../../shared';

/** Company sizes accepted by `UpdateEmployerProfileDto`. */
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

/** Editable keys — mirrors the backend DTO exactly. */
type EditableKey =
  | 'company_name'
  | 'crn'
  | 'company_phone'
  | 'industry'
  | 'company_size'
  | 'company_location'
  | 'company_website';

/** Text inputs rendered in the profile form. */
const FIELDS: { key: EditableKey; label: string; placeholder: string; type: string; helper?: string }[] = [
  { key: 'company_name', label: 'Company Name', placeholder: 'Tech Corp', type: 'text' },
  {
    key: 'crn',
    label: 'CRN No (Company Registration No) *',
    placeholder: 'e.g. CRN-12345678',
    type: 'text',
    helper: 'Mandatory standard number used by admin for company existence verification.',
  },
  { key: 'industry', label: 'Industry', placeholder: 'Cloud Computing', type: 'text' },
  { key: 'company_phone', label: 'Company Phone', placeholder: '+1-555-0100', type: 'tel' },
  { key: 'company_location', label: 'Location', placeholder: 'San Francisco, CA', type: 'text' },
  {
    key: 'company_website',
    label: 'Website',
    placeholder: 'https://company.com',
    type: 'url',
  },
];

/** Accepted logo image types (matches `IMAGE_UPLOAD_OPTIONS`). */
const LOGO_ACCEPT = 'image/png,image/jpeg,image/svg+xml';

/** Skeleton rows drawn while the page's three requests are in flight. */
const SKELETON_ROWS = [1, 2, 3, 4];

/** Shared pipe instance for the plain-function label helper below. */
const JOB_TYPE_PIPE = new JobTypePipe();

/** `full_time` → `Full Time`; an empty value keeps React's `No type` copy. */
function jobTypeLabel(value: string | null | undefined): string {
  return value ? JOB_TYPE_PIPE.transform(value) : 'No type';
}

/**
 * `/employer/profile`: company metadata, KPI tiles and the postings list.
 *
 * The initial load mirrors React's
 * `Promise.all([fetchEmployerProfile(), fetchEmployerJobs(), fetchEmployerStats()])`
 * as one `forkJoin`. A missing stats payload degrades to counts derived from
 * the job list (React's `stats ?? jobs.length` fallbacks) instead of failing
 * the page, because the profile form itself is still usable without it.
 * Profile edits and the logo are separate requests, so a failed image upload
 * never loses the text the employer just typed.
 */
@Component({
  selector: 'app-employer-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageContainerComponent,
    IconComponent,
    SkeletonComponent,
    StatCardComponent,
    StatusBadgeComponent,
    NgClass,
    DecimalPipe,
  ],
  template: `
    <app-page-container contentClassName="space-y-6">
      <header class="page-enter flex items-start justify-between flex-wrap gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
          <h1 class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24]">
            Company Profile
          </h1>
          <p class="mt-3 text-text-muted">How your company appears across the portal.</p>
          <a
            routerLink="/employer/dashboard"
            class="mt-3 inline-flex items-center gap-2 text-sm font-bold text-text-muted hover:text-[#1F2A24] transition-colors"
          >
            <app-icon name="arrow-left" [size]="16" /> Back to Dashboard
          </a>
        </div>
      </header>

      @if (loading()) {
        <div class="glass-card p-6 space-y-4">
          @for (row of rows; track row) {
            <app-skeleton variant="text" />
          }
        </div>
      } @else if (error()) {
        <div class="glass-card p-8 text-center text-red-500">{{ error() }}</div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          @for (tile of statTiles(); track tile.label; let i = $index) {
            <app-stat-card
              [label]="tile.label"
              [value]="tile.value"
              [icon]="tile.icon"
              [colorClass]="tile.colorClass"
              [loading]="loading()"
              [index]="i"
            />
          }
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <section class="glass-card p-6 lg:col-span-2">
            <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-5">Company details</h2>
            <form (submit)="save($event)" class="grid sm:grid-cols-2 gap-4">
              @for (field of fields; track field.key) {
                <div class="space-y-1" [ngClass]="{ 'sm:col-span-2': field.key === 'company_name' }">
                  <label
                    [for]="field.key"
                    class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                  >
                    {{ field.label }}
                  </label>
                  <input
                    [id]="field.key"
                    [type]="field.type"
                    class="input-field"
                    [placeholder]="field.placeholder"
                    [value]="value(field.key)"
                    (input)="onFieldChange(field.key, $event)"
                  />
                  @if (field.helper) {
                    <p class="text-[11px] text-brand-accent mt-0.5">{{ field.helper }}</p>
                  }
                </div>
              }

              <div class="space-y-1">
                <label
                  for="company_size"
                  class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                >
                  Company Size
                </label>
                <select
                  id="company_size"
                  class="input-field"
                  [value]="value('company_size')"
                  (change)="onFieldChange('company_size', $event)"
                >
                  @for (size of sizes; track size) {
                    <option [value]="size">{{ size }} employees</option>
                  }
                </select>
              </div>

              <div class="sm:col-span-2 flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  [disabled]="saving()"
                  class="btn-primary px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                >
                  {{ saving() ? 'Saving…' : 'Save profile' }}
                </button>
              </div>
            </form>
          </section>

          <section class="glass-card p-6">
            <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-5">Logo</h2>

            <div class="w-24 h-24 rounded-2xl bg-white border border-[#D8D2C4] flex items-center justify-center overflow-hidden mb-4">
              @if (logoSrc(); as logo) {
                <img
                  [src]="logo"
                  alt=""
                  class="w-full h-full object-contain p-2"
                  referrerpolicy="no-referrer"
                />
              } @else {
                <app-icon name="building" [size]="30" class="text-[#D4622A]" />
              }
            </div>

            <label
              for="logo-upload"
              class="block rounded-2xl border border-dashed border-[#D8D2C4] p-6 text-center cursor-pointer hover:border-[#D4622A] transition-colors"
            >
              <p class="text-sm font-bold text-[#1F2A24]">
                {{ uploading() ? 'Uploading…' : 'Upload a logo' }}
              </p>
              <p class="text-xs text-text-muted">PNG, JPG or SVG up to 2 MB</p>
              <input
                id="logo-upload"
                type="file"
                class="hidden"
                [accept]="logoAccept"
                [disabled]="uploading()"
                (change)="onLogoSelected($event)"
              />
            </label>
          </section>
        </div>

        <section class="glass-card p-6">
          <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
            <app-icon name="briefcase" [size]="20" class="text-brand-accent" />
            Jobs Posted
          </h2>

          @if (jobs().length === 0) {
            <p class="text-sm text-text-muted text-center py-10">No jobs posted yet.</p>
          } @else {
            <div class="space-y-4">
              @for (job of jobs(); track job.job_id) {
                <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
                  <div class="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <a
                        [routerLink]="['/employer/my-jobs', job.job_id]"
                        [state]="{ job: job }"
                        class="text-[#1F2A24] font-semibold hover:text-[#D4622A] transition-colors"
                      >
                        {{ job.title || 'Untitled Job' }}
                      </a>
                      <p class="text-sm text-text-muted mt-1">
                        {{ job.location || 'No location' }} · {{ jobTypeLabel(job.job_type) }}
                      </p>
                      @if (job.salary_min && job.salary_max) {
                        <p class="text-xs text-text-muted mt-1">
                          Salary: {{ job.salary_min | number }} - {{ job.salary_max | number }}
                        </p>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      <app-status-badge variant="job" [value]="job.status" />
                      <app-status-badge
                        variant="verification"
                        [value]="job.is_verified ? 'true' : 'false'"
                      />
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </section>
      }
    </app-page-container>
  `,
})
export class EmployerProfilePage {
  private readonly employerService = inject(EmployerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = signal<EmployerProfile | null>(null);

  /** Uploaded logo resolved for the `<img>` (local `/uploads/...` or a CDN). */
  readonly logoSrc = computed(() => assetUrl(this.profile()?.profile_picture_url));

  /** The company's postings — also the fallback source for the KPI tiles. */
  readonly jobs = signal<EmployerJob[]>([]);

  private readonly stats = signal<EmployerStats | null>(null);

  private readonly form = signal<Record<EditableKey, string>>({
    company_name: '',
    crn: '',
    company_phone: '',
    industry: '',
    company_size: '1-10',
    company_location: '',
    company_website: '',
  });

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal('');

  readonly fields = FIELDS;
  readonly sizes = COMPANY_SIZES;
  readonly logoAccept = LOGO_ACCEPT;
  readonly rows = SKELETON_ROWS;

  /** Exposes the module-level label helper to the template. */
  readonly jobTypeLabel = jobTypeLabel;

  /**
   * React's `EmployerStatsGrid`: API counters first, job-list counts when the
   * stats payload is missing.
   */
  readonly statTiles = computed(() => {
    const stats = this.stats();
    const jobs = this.jobs();
    const openJobs = jobs.filter((job) => job.status === 'open').length;
    const verifiedJobs = jobs.filter((job) => job.is_verified).length;

    return [
      {
        label: 'Jobs Posted',
        value: stats?.total_jobs ?? jobs.length,
        icon: 'briefcase' as const,
        colorClass: 'bg-yellow-500/10 text-[#B45309]',
      },
      {
        label: 'Open Listings',
        value: stats?.open_jobs ?? openJobs,
        icon: 'trending-up' as const,
        colorClass: 'bg-green-500/10 text-[#166534]',
      },
      {
        label: 'Verified Jobs',
        value: stats?.verified_jobs ?? verifiedJobs,
        icon: 'shield-check' as const,
        colorClass: 'bg-[#F3ECE0] text-[#1F2A24]',
      },
      {
        label: 'Applicants',
        value: stats?.total_applications ?? 0,
        icon: 'users' as const,
        colorClass: 'bg-brand-accent/10 text-brand-accent',
      },
    ];
  });

  constructor() {
    // One round trip for all three sources, like React's `Promise.all`.
    forkJoin({
      profile: this.employerService.profile(),
      jobs: this.employerService.myJobs(),
      stats: this.employerService.stats().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ profile, jobs, stats }) => {
          this.profile.set(profile);
          this.jobs.set(jobs);
          this.stats.set(stats);
          this.form.set({
            company_name: profile.company_name ?? '',
            crn: profile.crn ?? '',
            company_phone: profile.company_phone ?? '',
            industry: profile.industry ?? '',
            company_size:
              profile.company_size &&
              (COMPANY_SIZES as readonly string[]).includes(profile.company_size)
                ? profile.company_size
                : '1-10',
            company_location: profile.company_location ?? '',
            company_website: profile.company_website ?? '',
          });
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.message(error, 'Failed to load your company profile'));
        },
      });
  }

  value(key: EditableKey): string {
    return this.form()[key];
  }

  onFieldChange(key: EditableKey, event: Event): void {
    const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;
    const value = key === 'crn' ? raw.toUpperCase() : raw;
    this.form.update((form) => ({ ...form, [key]: value }));
  }

  /** `PUT /api/employer/profile` with only the editable fields. */
  save(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    const form = this.form();
    const crn = form.crn.trim().toUpperCase();
    if (!crn) {
      this.toast.error('Company Registration Number (CRN) is mandatory.');
      return;
    }
    const crnPattern = /^[A-Z0-9\-]{5,30}$/;
    if (!crnPattern.test(crn)) {
      this.toast.error('CRN must be a valid standard format (5-30 alphanumeric characters, e.g. CRN-12345678).');
      return;
    }

    const payload: Partial<EmployerProfile> = {
      company_name: form.company_name.trim(),
      crn,
      company_phone: form.company_phone.trim(),
      industry: form.industry.trim(),
      company_size: form.company_size,
      company_location: form.company_location.trim(),
      company_website: form.company_website.trim(),
    };

    this.saving.set(true);
    this.employerService
      .updateProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.profile.update((profile) => (profile ? { ...profile, ...payload } : profile));
          this.toast.success('Profile updated successfully.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.toast.error(this.message(error, 'Failed to update profile'));
        },
      });
  }

  /** `POST /api/employer/logo` — multipart upload under `image`. */
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('Logo must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.employerService
      .uploadLogo(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.uploading.set(false);
          input.value = '';
          // Re-read the profile so the preview uses the stored URL, not a
          // blob object URL that would not survive a reload.
          this.refreshProfile();
          this.toast.success('Company logo updated successfully.');
        },
        error: (error: unknown) => {
          this.uploading.set(false);
          input.value = '';
          this.toast.error(this.message(error, 'Failed to upload logo'));
        },
      });
  }

  /** Re-fetches the company profile (used after a logo upload). */
  private refreshProfile(): void {
    this.employerService
      .profile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => this.profile.set(profile),
        error: () => undefined,
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
