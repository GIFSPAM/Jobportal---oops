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
import { EmployerApplicant } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import {
  IconComponent,
  PageContainerComponent,
  SkeletonComponent,
} from '../../shared';
import { EmployerApplicantRowComponent } from './employer-applicant-row.component';

/** Proficiency levels the backend filters on. */
const PROFICIENCIES = ['beginner', 'intermediate', 'advanced'] as const;

/** Column headers of the applicants table (React's column set). */
const COLUMNS = ['Candidate', 'Status', 'Experience', 'Applied At', 'Resume', 'Action'];

/**
 * `/employer/applications/job/:jobId`: one posting's candidate list.
 *
 * The free-text search filters the loaded rows client-side exactly like the
 * React page; the sort/proficiency/skill controls are an additive pass-through
 * to query parameters the endpoint already accepts, so they stay server-side.
 */
@Component({
  selector: 'app-employer-job-applicants-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageContainerComponent,
    SkeletonComponent,
    IconComponent,
    TitleCasePipe,
    EmployerApplicantRowComponent,
  ],
  template: `
    <app-page-container maxWidthClass="max-w-7xl">
      <header class="page-enter flex items-end justify-between flex-wrap gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
          <h1
            class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24] flex items-center gap-2"
          >
            <app-icon name="users" [size]="28" class="text-brand-accent" /> Applicants
          </h1>
          <p class="mt-3 text-text-muted">
            {{ jobTitle() }} — review all applicants for this specific job.
          </p>
        </div>
        <a
          routerLink="/employer/applications"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-sm font-bold text-text-muted hover:bg-white hover:border-[#D4622A] hover:text-[#D4622A] active:scale-95 transition-all shadow-sm"
        >
          <app-icon name="arrow-left" [size]="16" /> Back to Jobs
        </a>
      </header>

      <div class="glass-card p-5 sm:p-6 mt-6 space-y-4">
        <div class="space-y-1">
          <label
            for="applicant-search"
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
              id="applicant-search"
              type="search"
              class="input-field input-field-with-icon"
              placeholder="Search by candidate, status, phone, or application ID"
              [value]="search()"
              (input)="onSearch($event)"
            />
          </div>
        </div>

        <div class="flex items-end gap-3 flex-wrap">
          <div class="space-y-1 min-w-55">
            <label
              for="applicant-sort"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Sort by
            </label>
            <select
              id="applicant-sort"
              class="input-field h-12"
              [value]="sortBy()"
              (change)="onSortChange($event)"
            >
              <option value="date">Most recent</option>
              <option value="experience">Experience</option>
            </select>
          </div>

          <div class="space-y-1 min-w-55">
            <label
              for="applicant-proficiency"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Proficiency
            </label>
            <select
              id="applicant-proficiency"
              class="input-field h-12"
              [value]="proficiency()"
              (change)="onProficiencyChange($event)"
            >
              <option value="">Any level</option>
              @for (level of proficiencies; track level) {
                <option [value]="level">{{ level | titlecase }}</option>
              }
            </select>
          </div>

          <div class="space-y-1 flex-1 min-w-65">
            <label
              for="applicant-skill"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Skill
            </label>
            <input
              id="applicant-skill"
              type="text"
              class="input-field"
              placeholder="e.g. TypeScript"
              [value]="skillName()"
              (input)="onSkillInput($event)"
              (keyup.enter)="reload()"
            />
          </div>

          <button
            type="button"
            (click)="reload()"
            class="btn-primary px-6 h-12 rounded-full text-sm font-bold shadow-sm hover:shadow active:scale-95 transition-all"
          >
            Apply
          </button>
          <button
            type="button"
            (click)="resetFilters()"
            class="px-5 h-12 rounded-full border border-[#D8D2C4] bg-white text-sm font-bold text-[#1F2A24] hover:border-[#D4622A] hover:text-[#D4622A] active:scale-95 transition-all shadow-sm"
          >
            Reset
          </button>
        </div>
      </div>

      <div class="glass-card p-6 sm:p-8 mt-6">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
          <app-icon name="file-text" [size]="20" class="text-brand-accent" />
          Applicant List
        </h2>

        @if (loading()) {
          <div class="space-y-3">
            @for (row of rows; track row) {
              <app-skeleton variant="row" />
            }
          </div>
        } @else if (error()) {
          <p class="py-12 text-center text-red-500">{{ error() }}</p>
        } @else if (filtered().length === 0) {
          <p class="py-12 text-center text-text-muted">No applicants found for this job.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs font-bold text-text-muted uppercase tracking-widest border-b border-[#D8D2C4]"
                >
                  <th class="text-left pb-4 px-2">Candidate</th>
                  <th class="text-left pb-4 px-2">Status</th>
                  <th class="text-left pb-4 px-2">Experience</th>
                  <th class="text-left pb-4 px-2">Applied At</th>
                  <th class="text-left pb-4 px-2">Resume</th>
                  <th class="text-left pb-4 px-2">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#D8D2C4]">
                @for (applicant of filtered(); track applicant.application_id) {
                  <tr
                    app-employer-applicant-row
                    [applicant]="applicant"
                    [showJobTitle]="false"
                    [showExperience]="true"
                    [downloadingId]="downloadingId()"
                    (download)="download($event)"
                  ></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </app-page-container>
  `,
})
export class EmployerJobApplicantsPage {
  private readonly employerService = inject(EmployerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Job id taken from the route. */
  readonly jobId = Number(this.route.snapshot.paramMap.get('jobId'));

  /**
   * Posting title passed by the list page — React's `location.state.jobTitle`.
   *
   * Read from the current navigation so a bookmarked or reloaded URL still
   * renders (it falls back to `Job #id`, same as the React page).
   */
  readonly jobTitle = signal(this.resolveJobTitle());

  readonly applicants = signal<EmployerApplicant[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  /** Client-side free-text search (React's only filter on this page). */
  readonly search = signal('');

  /** Server-side filter state — additive pass-through to query parameters. */
  readonly sortBy = signal<'date' | 'experience'>('date');
  readonly proficiency = signal('');
  readonly skillName = signal('');

  /** Application whose resume download is in flight. */
  readonly downloadingId = signal<number | null>(null);

  readonly columns = COLUMNS;
  readonly proficiencies = PROFICIENCIES;
  readonly rows = [1, 2, 3, 4];

  /** React's `filteredApplicants`: one substring match over the row's text. */
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const rows = this.applicants();
    if (!query) return rows;

    return rows.filter((item) => {
      const text = [
        String(item.application_id ?? ''),
        item.application_status ?? '',
        item.seeker.full_name ?? '',
        item.seeker.education ?? '',
        item.seeker.phone_number ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(query);
    });
  });

  constructor() {
    if (!Number.isInteger(this.jobId) || this.jobId <= 0) {
      this.toast.error('Invalid job ID');
      void this.router.navigate(['/employer/applications'], { replaceUrl: true });
      return;
    }

    this.load();
  }

  /** Re-requests the list with the chosen server-side sort. */
  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as 'date' | 'experience');
    this.load();
  }

  onProficiencyChange(event: Event): void {
    this.proficiency.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  onSkillInput(event: Event): void {
    this.skillName.set((event.target as HTMLInputElement).value);
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  reload(): void {
    this.load();
  }

  resetFilters(): void {
    this.sortBy.set('date');
    this.proficiency.set('');
    this.skillName.set('');
    this.search.set('');
    this.load();
  }

  /** Adds the posting's context so the detail page needs no second lookup. */
  withJobContext(applicant: EmployerApplicant): EmployerApplicant & { job_id: number; job_title: string } {
    return { ...applicant, job_id: this.jobId, job_title: this.jobTitle() };
  }

  /**
   * Streams the resume as an authenticated blob — the download route sits
   * behind the JWT guard, so the service builds the absolute URL and attaches
   * the bearer header instead of using a plain link.
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

  private resolveJobTitle(): string {
    const state = this.router.getCurrentNavigation()?.extras.state as { jobTitle?: string } | null;
    return state?.jobTitle || `Job #${this.route.snapshot.paramMap.get('jobId') ?? ''}`;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.employerService
      .applicants(this.jobId, {
        sort_by: this.sortBy(),
        proficiency: this.proficiency() || undefined,
        skill_name: this.skillName().trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (applicants) => {
          this.applicants.set(applicants);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.message(error, 'Failed to fetch applicants'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
