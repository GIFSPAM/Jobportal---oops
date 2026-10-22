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
import { forkJoin } from 'rxjs';
import { EmployerService } from '../../core/employer/employer.service';
import { EmployerApplicant, EmployerJob } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import {
  IconComponent,
  JobTypePipe,
  PageContainerComponent,
  SkeletonComponent,
  StatusBadgeComponent,
} from '../../shared';
import { EmployerApplicantRowComponent } from './employer-applicant-row.component';

/** Shared pipe instance for the plain-function label helper below. */
const JOB_TYPE_PIPE = new JobTypePipe();

/** `full_time` → `Full Time`; an empty value keeps the table's `N/A`. */
function jobTypeLabel(value: string | null | undefined): string {
  return value ? JOB_TYPE_PIPE.transform(value) : 'N/A';
}

/** Which of the page's two tables is on screen. */
type ViewTab = 'jobs' | 'applications';

/** Both view tabs, in render order. */
const VIEW_TABS: ViewTab[] = ['jobs', 'applications'];

/** Status pills shown above the applications table. */
const STATUS_TABS = ['all', 'applied', 'shortlisted', 'rejected', 'hired'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

/** Column headers of the "Jobs With Applications" table. */
const JOB_COLUMNS = ['Job', 'Location', 'Type', 'Status', 'Applicants', 'Action'];

/** Column headers of the "All Applications" table. */
const APPLICATION_COLUMNS = ['Candidate', 'Job', 'Status', 'Applied At', 'Resume', 'Action'];

/** An application enriched with the posting it belongs to. */
type ApplicationRow = EmployerApplicant & { job_id: number; job_title: string };

/** Human-readable caption for a view tab. */
function tabLabel(tab: ViewTab): string {
  return tab === 'jobs' ? 'Jobs' : 'All Applications';
}

/**
 * `/employer/applications`: the React page's two views in one route.
 *
 * Data mirrors React's `Promise.all([fetchEmployerJobs(), fetchEmployerApplicants()])`
 * as a single `forkJoin` — the jobs table plus the flattened per-job applicant
 * list arrive together, and `applicant_count` is recomputed from the applicant
 * rows exactly the way React's `countByJob` does. Both filters (search, skill)
 * and the status pills then run client-side over that one snapshot.
 */
@Component({
  selector: 'app-employer-applications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageContainerComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    IconComponent,
    EmployerApplicantRowComponent,
  ],
  template: `
    <app-page-container maxWidthClass="max-w-7xl">
      <header class="page-enter">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
        <h1
          class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24] flex items-center gap-2"
        >
          <app-icon name="users" [size]="28" class="text-brand-accent" /> Applications
        </h1>
        <p class="mt-3 text-text-muted">Select a posted job to view its applicants.</p>
      </header>

      <div class="glass-card p-5 sm:p-6 mt-6">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          @for (tab of tabs; track tab) {
            <button
              type="button"
              [class]="viewTabClasses(tab)"
              [attr.aria-pressed]="activeTab() === tab"
              (click)="activeTab.set(tab)"
            >
              {{ tab === 'jobs' ? 'Jobs' : 'All Applications' }}
            </button>
          }
        </div>

        <label
          for="apps-search"
          class="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2"
        >
          Search
        </label>
        <div class="relative">
          <app-icon
            class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
            name="search"
            [size]="16"
          />
          <input
            id="apps-search"
            type="search"
            class="input-field input-field-with-icon"
            [placeholder]="searchPlaceholder()"
            [value]="search()"
            (input)="onSearch($event)"
          />
        </div>

        <div class="mt-4">
          <label
            for="apps-skill"
            class="block text-xs font-bold uppercase tracking-widest text-text-muted mb-2"
          >
            Skill
          </label>
          <select
            id="apps-skill"
            class="input-field capitalize"
            [value]="skillFilter()"
            (change)="onSkillFilter($event)"
          >
            <option value="all">All Skills</option>
            @for (skill of availableSkills(); track skill) {
              <option [value]="skill">{{ skill }}</option>
            }
          </select>
        </div>

        @if (activeTab() === 'applications') {
          <div class="flex flex-wrap items-center gap-2 mt-4" role="group" aria-label="Filter by status">
            @for (tab of statusTabs; track tab) {
              <button
                type="button"
                [class]="statusTabClasses(tab)"
                [attr.aria-pressed]="statusFilter() === tab"
                (click)="statusFilter.set(tab)"
              >
                {{ tab === 'all' ? 'All' : tab }}
              </button>
            }
          </div>
        }
      </div>

      <div class="glass-card p-6 sm:p-8 mt-6">
        @if (loading()) {
          <div class="space-y-3">
            @for (row of rows; track row) {
              <app-skeleton variant="row" />
            }
          </div>
        } @else if (error()) {
          <p class="py-12 text-center text-red-500">{{ error() }}</p>
        } @else if (activeTab() === 'jobs') {
          <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
            <app-icon name="file-text" [size]="20" class="text-brand-accent" />
            Jobs With Applications
          </h2>

          @if (filteredJobs().length === 0) {
            <p class="py-12 text-center text-text-muted">No matching jobs found.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr
                    class="text-xs font-bold text-text-muted uppercase tracking-widest border-b border-[#D8D2C4]"
                  >
                    @for (column of jobColumns; track column) {
                      <th class="text-left pb-4 px-2">{{ column }}</th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#D8D2C4]">
                  @for (job of filteredJobs(); track job.job_id) {
                    <tr class="hover:bg-[#FAF8F3] transition-colors">
                      <td class="py-4 px-2">
                        <a
                          [routerLink]="['/employer/applications/job', job.job_id]"
                          [state]="{ jobTitle: job.title || 'Untitled Job' }"
                          class="font-medium text-[#1F2A24] inline-flex items-center gap-2 hover:text-[#D4622A] transition-colors"
                        >
                          <app-icon name="briefcase" [size]="16" class="text-brand-accent" />
                          {{ job.title || 'Untitled Job' }}
                        </a>
                        <p class="text-xs text-text-muted mt-1">Job ID: {{ job.job_id }}</p>
                      </td>
                      <td class="py-4 px-2 text-text-muted">{{ job.location || 'N/A' }}</td>
                      <td class="py-4 px-2 text-text-muted">
                        {{ jobTypeLabel(job.job_type) }}
                      </td>
                      <td class="py-4 px-2">
                        <app-status-badge variant="job" [value]="job.status" />
                      </td>
                      <td class="py-4 px-2 text-text-muted">{{ job.applicant_count ?? 0 }}</td>
                      <td class="py-4 px-2">
                        <a
                          [routerLink]="['/employer/applications/job', job.job_id]"
                          [state]="{ jobTitle: job.title || 'Untitled Job' }"
                          class="text-xs font-semibold text-text-muted hover:text-[#D4622A] transition-colors"
                        >
                          View Applicants
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        } @else {
          <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
            <app-icon name="file-text" [size]="20" class="text-brand-accent" />
            All Applications
          </h2>

          @if (filteredApplications().length === 0) {
            <p class="py-12 text-center text-text-muted">No applications found.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr
                    class="text-xs font-bold text-text-muted uppercase tracking-widest border-b border-[#D8D2C4]"
                  >
                    <th class="text-left pb-4 px-2">Candidate</th>
                    <th class="text-left pb-4 px-2">Job</th>
                    <th class="text-left pb-4 px-2">Status</th>
                    <th class="text-left pb-4 px-2">Applied At</th>
                    <th class="text-left pb-4 px-2">Resume</th>
                    <th class="text-left pb-4 px-2">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#D8D2C4]">
                  @for (row of filteredApplications(); track row.application_id) {
                    <app-employer-applicant-row
                      [applicant]="row"
                      [showJobTitle]="true"
                      [showExperience]="false"
                      [downloadingId]="downloadingId()"
                      (download)="download($event)"
                    />
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </app-page-container>
  `,
})
export class EmployerApplicationsPage {
  private readonly employerService = inject(EmployerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Jobs the company has posted, with `applicant_count` recomputed below. */
  readonly jobs = signal<EmployerJob[]>([]);

  /** Every application across those jobs, flattened with job context. */
  readonly applications = signal<ApplicationRow[]>([]);

  readonly loading = signal(true);
  readonly error = signal('');

  /** Which table is visible — the React page's `activeTab`. */
  readonly activeTab = signal<ViewTab>('jobs');
  readonly search = signal('');
  readonly skillFilter = signal('all');
  readonly statusFilter = signal<StatusTab>('all');

  /** Application whose resume download is in flight. */
  readonly downloadingId = signal<number | null>(null);

  readonly tabs = VIEW_TABS;
  readonly statusTabs = STATUS_TABS;
  readonly jobColumns = JOB_COLUMNS;
  readonly applicationColumns = APPLICATION_COLUMNS;
  readonly rows = [1, 2, 3, 4];

  /** Exposes the module-level label helper to the template. */
  readonly jobTypeLabel = jobTypeLabel;

  /** Distinct seeker skills across all applications, sorted for the select. */
  readonly availableSkills = computed(() => {
    const names = new Set<string>();
    for (const row of this.applications()) {
      for (const skill of row.seeker.skills ?? []) {
        const name = (skill.name ?? '').trim().toLowerCase();
        if (name) names.add(name);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  });

  /** React's `filteredJobs`: skill match first, then the free-text query. */
  readonly filteredJobs = computed(() => {
    const query = this.search().trim().toLowerCase();
    const skill = this.skillFilter();
    const applications = this.applications();

    return this.jobs().filter((job) => {
      const matchesSkill =
        skill === 'all' ||
        applications.some(
          (row) =>
            Number(row.job_id) === Number(job.job_id) &&
            (row.seeker.skills ?? []).some(
              (item) => (item.name ?? '').trim().toLowerCase() === skill,
            ),
        );
      if (!matchesSkill) return false;
      if (!query) return true;

      const text = [
        String(job.job_id ?? ''),
        job.title ?? '',
        job.location ?? '',
        job.job_type ?? '',
        job.status ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
  });

  /** React's `filteredApplications`: status pill, skill, then free text. */
  readonly filteredApplications = computed(() => {
    const query = this.search().trim().toLowerCase();
    const skill = this.skillFilter();
    const statusTab = this.statusFilter();

    return this.applications().filter((row) => {
      const status = (row.application_status ?? 'applied').toLowerCase();
      if (statusTab !== 'all' && status !== statusTab) return false;

      if (
        skill !== 'all' &&
        !(row.seeker.skills ?? []).some(
          (item) => (item.name ?? '').trim().toLowerCase() === skill,
        )
      ) {
        return false;
      }

      if (!query) return true;

      const text = [
        String(row.application_id ?? ''),
        String(row.job_id ?? ''),
        row.job_title ?? '',
        row.seeker.full_name ?? '',
        row.seeker.education ?? '',
        row.seeker.phone_number ?? '',
        status,
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
  });

  constructor() {
    // One round trip for both halves, mirroring React's `Promise.all` — the
    // job list and the per-job applicant fan-out land in the same tick, so the
    // counts in the jobs table can never be computed from a stale applicant set.
    forkJoin({
      jobs: this.employerService.myJobs(),
      applicants: this.employerService.allApplicants(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ jobs, applicants }) => {
          const countByJob = new Map<number, number>();
          for (const row of applicants) {
            countByJob.set(row.job_id, (countByJob.get(row.job_id) ?? 0) + 1);
          }

          this.jobs.set(
            jobs.map((job) => ({
              ...job,
              applicant_count: countByJob.get(Number(job.job_id)) ?? Number(job.applicant_count ?? 0),
            })),
          );
          this.applications.set(applicants);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          const message = this.message(error, 'Failed to fetch applications data');
          this.error.set(message);
          this.toast.error(message);
        },
      });
  }

  /** Placeholder switches with the active tab, exactly like React. */
  searchPlaceholder(): string {
    return this.activeTab() === 'jobs'
      ? 'Search by job title, location, type, status, or ID'
      : 'Search by candidate, job, phone, status, or ID';
  }

  /** Selected/unselected styling for the Jobs / All Applications switcher. */
  viewTabClasses(tab: ViewTab): string {
    const base =
      'inline-flex items-center justify-center min-w-32 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all';
    return this.activeTab() === tab
      ? `${base} bg-brand-accent text-white border-brand-accent`
      : `${base} bg-[#FAF8F3] text-text-muted border-[#D8D2C4] hover:text-[#1F2A24]`;
  }

  /** Selected/unselected styling for the application-status pills. */
  statusTabClasses(tab: StatusTab): string {
    const base =
      'px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest transition-all';
    return this.statusFilter() === tab
      ? `${base} bg-brand-accent text-white border-brand-accent`
      : `${base} bg-[#FAF8F3] text-text-muted border-[#D8D2C4] hover:text-[#1F2A24]`;
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onSkillFilter(event: Event): void {
    this.skillFilter.set((event.target as HTMLSelectElement).value);
  }

  /**
   * Streams the resume as an authenticated blob.
   *
   * The endpoint (`resume_url` points at `/api/auth/resume-download/:id`)
   * sits behind the global JWT guard, so a plain `<a href>` would be rejected;
   * the service builds the absolute URL from `api.baseUrl` and attaches the
   * bearer header, exactly as React's blob download does.
   */
  download(applicationId: number): void {
    this.downloadingId.set(applicationId);
    this.employerService
      .downloadResume(applicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.downloadingId.set(null);
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `resume-${applicationId}.pdf`;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: (error: unknown) => {
          this.downloadingId.set(null);
          this.toast.error(this.message(error, 'Failed to download resume'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
