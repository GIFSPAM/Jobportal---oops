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
import { map } from 'rxjs';
import { EmployerService } from '../../core/employer/employer.service';
import { EmployerJob } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import {
  DetailFieldCardComponent,
  JobTypePipe,
  PageContainerComponent,
  SkeletonComponent,
  StatusBadgeComponent,
  DatePipe,
} from '../../shared';

/** Job types accepted by `UpdateJobDto` (the API rejects `contract`). */
const JOB_TYPES = ['full_time', 'part_time', 'internship'] as const;

/** Formats a salary range, or reports that none is set. */
function formatSalary(min: number | null | undefined, max: number | null | undefined): string {
  if (min === null || min === undefined || max === null || max === undefined) {
    return 'Not specified';
  }
  return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
}

/** Editable draft of a posting — all numeric fields stay strings while typing. */
type JobDraftForm = {
  title: string;
  location: string;
  job_type: string;
  salary_min: string;
  salary_max: string;
  description: string;
  skills: string;
};

/** Mirrors React's `loadDraftFromJob` — one posting in, one draft out. */
function draftFrom(job: EmployerJob): JobDraftForm {
  return {
    title: job.title ?? '',
    location: job.location ?? '',
    job_type: (job.job_type ?? 'full_time').toLowerCase(),
    salary_min: job.salary_min !== null && job.salary_min !== undefined ? String(job.salary_min) : '',
    salary_max: job.salary_max !== null && job.salary_max !== undefined ? String(job.salary_max) : '',
    description: job.description ?? '',
    skills: (job.skills ?? []).join(', '),
  };
}

/**
 * `/employer/my-jobs/:jobId`: one posting with all of its controls.
 *
 * Resolved from `GET /api/employer/my-jobs` (the API has no single-job
 * employer read), which also keeps the applicant count and verification state
 * in the same payload the list page shows.
 */
@Component({
  selector: 'app-employer-my-job-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageContainerComponent,
    DetailFieldCardComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    JobTypePipe,
    DatePipe,
  ],
  template: `
    <app-page-container contentClassName="space-y-6">
      <header class="page-enter flex items-start justify-between flex-wrap gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
          <h1 class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24]">
            {{ job()?.title || 'Job Details' }}
          </h1>
          <div class="mt-3 flex items-center gap-2 flex-wrap">
            @if (job(); as current) {
              <span class="chip-parchment px-3 py-1 rounded-full text-xs font-bold">
                {{ current.job_type | jobType }}
              </span>
              <app-status-badge variant="job" [value]="current.status" />
              <app-status-badge
                variant="verification"
                [value]="current.is_verified ? 'true' : 'false'"
              />
            }
          </div>
        </div>
        <a
          routerLink="/employer/my-jobs"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-sm font-bold text-[#6B6459] hover:bg-white hover:border-[#D4622A] hover:text-[#D4622A] active:scale-95 transition-all shadow-sm"
        >
          ← All jobs
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
      } @else if (job(); as current) {
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <app-detail-field-card label="Location" [value]="current.location || '—'" />
          <app-detail-field-card label="Salary" [value]="salary(current)" />
          <app-detail-field-card label="Applicants" [value]="current.applicant_count" />
          <app-detail-field-card label="Posted" [value]="current.posted_at | appDate" />
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <section class="glass-card p-6 lg:col-span-2">
            @if (editMode()) {
              <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-4">Edit job</h2>
              <form (submit)="save($event)" class="space-y-4">
                <div class="space-y-1">
                  <label
                    for="edit-title"
                    class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                  >
                    Job title
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    class="input-field"
                    [value]="draft().title"
                    (input)="onDraftChange('title', $event)"
                  />
                </div>

                <div class="space-y-1">
                  <label
                    for="edit-location"
                    class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                  >
                    Location
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    class="input-field"
                    [value]="draft().location"
                    (input)="onDraftChange('location', $event)"
                  />
                </div>

                <div class="grid sm:grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label
                      for="edit-type"
                      class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                    >
                      Job type
                    </label>
                    <select
                      id="edit-type"
                      class="input-field"
                      [value]="draft().job_type"
                      (change)="onDraftChange('job_type', $event)"
                    >
                      @for (type of jobTypes; track type) {
                        <option [value]="type">{{ type | jobType }}</option>
                      }
                    </select>
                  </div>

                  <div class="space-y-1">
                    <span
                      class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                    >
                      Salary range
                    </span>
                    <div class="grid grid-cols-2 gap-2">
                      <label for="edit-salary-min" class="sr-only">Minimum salary</label>
                      <input
                        id="edit-salary-min"
                        type="number"
                        min="0"
                        placeholder="Min"
                        class="input-field"
                        [value]="draft().salary_min"
                        (input)="onDraftChange('salary_min', $event)"
                      />
                      <label for="edit-salary-max" class="sr-only">Maximum salary</label>
                      <input
                        id="edit-salary-max"
                        type="number"
                        min="0"
                        placeholder="Max"
                        class="input-field"
                        [value]="draft().salary_max"
                        (input)="onDraftChange('salary_max', $event)"
                      />
                    </div>
                  </div>
                </div>

                <div class="space-y-1">
                  <label
                    for="edit-description"
                    class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                  >
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    class="input-field h-40 py-3"
                    [value]="draft().description"
                    (input)="onDraftChange('description', $event)"
                  ></textarea>
                </div>

                <div class="space-y-1">
                  <label
                    for="edit-skills"
                    class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
                  >
                    Required skills
                  </label>
                  <input
                    id="edit-skills"
                    type="text"
                    class="input-field"
                    placeholder="Comma separated, e.g. typescript, angular"
                    [value]="draft().skills"
                    (input)="onDraftChange('skills', $event)"
                  />
                </div>

                <div class="flex items-center gap-3 flex-wrap">
                  <button
                    type="submit"
                    [disabled]="saving()"
                    class="btn-primary px-6 py-3 rounded-full text-sm font-bold disabled:opacity-60"
                  >
                    {{ saving() ? 'Saving…' : 'Save Changes' }}
                  </button>
                  <button
                    type="button"
                    (click)="cancelEdit()"
                    [disabled]="saving()"
                    class="px-5 py-3 rounded-full border border-[#D8D2C4] text-sm font-bold text-[#1F2A24] hover:border-[#D4622A] transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            } @else {
              <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-4">Description</h2>
              <p class="text-text-muted leading-relaxed whitespace-pre-line">
                {{ current.description || 'No description provided.' }}
              </p>

              @if (current.skills?.length) {
                <div class="flex flex-wrap gap-2 mt-6">
                  @for (skill of current.skills; track skill) {
                    <span class="chip-parchment px-3 py-1 rounded-full text-xs font-bold">
                      {{ skill }}
                    </span>
                  }
                </div>
              }
            }
          </section>

          <section class="glass-card p-6">
            <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-5">Manage</h2>
            <div class="space-y-3">
              @if (!editMode()) {
                <button
                  type="button"
                  (click)="startEdit()"
                  class="block w-full py-3 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-center text-sm font-bold text-[#1F2A24] hover:bg-white hover:border-[#D4622A] hover:text-[#D4622A] active:scale-[0.98] transition-all shadow-sm"
                >
                  Edit job
                </button>
              }
              <a
                [routerLink]="['/employer/applications/job', current.job_id]"
                class="block w-full py-3 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-center text-sm font-bold text-[#1F2A24] hover:bg-white hover:border-[#D4622A] hover:text-[#D4622A] active:scale-[0.98] transition-all shadow-sm"
              >
                View applicants ({{ current.applicant_count }})
              </a>
              <button
                type="button"
                (click)="toggleStatus(current)"
                [disabled]="busy()"
                class="block w-full py-3 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-center text-sm font-bold text-[#1F2A24] hover:bg-white hover:border-[#D4622A] hover:text-[#D4622A] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
              >
                {{ current.status === 'open' ? 'Close job' : 'Reopen job' }}
              </button>

              @if (confirming()) {
                <button
                  type="button"
                  (click)="remove(current.job_id)"
                  [disabled]="busy()"
                  class="block w-full py-3 rounded-full bg-red-600 text-white text-center text-sm font-bold hover:bg-red-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                >
                  {{ busy() ? 'Deleting…' : 'Yes, delete this job' }}
                </button>
                <button
                  type="button"
                  (click)="confirming.set(false)"
                  class="block w-full py-2.5 rounded-full border border-[#D8D2C4] bg-white text-center text-xs font-bold text-text-muted hover:text-[#1F2A24] active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
              } @else {
                <button
                  type="button"
                  (click)="confirming.set(true)"
                  class="block w-full py-3 rounded-full border border-red-500/30 bg-red-50 text-center text-sm font-bold text-red-600 hover:bg-red-100 hover:border-red-500/50 active:scale-[0.98] transition-all shadow-sm"
                >
                  Delete job
                </button>
              }
            </div>
          </section>
        </div>
      }
    </app-page-container>
  `,
})
export class EmployerMyJobDetailPage {
  private readonly employerService = inject(EmployerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly jobId = Number(this.route.snapshot.paramMap.get('jobId'));

  private readonly jobState = signal<EmployerJob | null>(null);

  readonly job = this.jobState.asReadonly();
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly confirming = signal(false);

  /** Inline editing — React's `editMode` flag for this posting. */
  readonly editMode = signal(false);

  /** True while `PATCH /api/employer/update/:job_id` is in flight. */
  readonly saving = signal(false);

  /** Fields bound to the edit form (salary kept as text while typing). */
  readonly draft = signal<JobDraftForm>({
    title: '',
    location: '',
    job_type: 'full_time',
    salary_min: '',
    salary_max: '',
    description: '',
    skills: '',
  });

  readonly rows = [1, 2, 3, 4];

  /** Job types offered by the edit form. */
  readonly jobTypes = JOB_TYPES;

  constructor() {
    // React seeds from `location.state.job` first — a click-through from the
    // list renders instantly and the fetch below only runs for deep links.
    const seeded = this.readRouterState();
    const shouldEdit = this.shouldStartInEditMode();
    if (seeded) {
      this.jobState.set(seeded);
      this.draft.set(draftFrom(seeded));
      if (shouldEdit) this.editMode.set(true);
      this.loading.set(false);
      return;
    }

    if (!Number.isInteger(this.jobId) || this.jobId <= 0) {
      this.toast.error('Invalid job ID');
      void this.router.navigate(['/employer/my-jobs'], { replaceUrl: true });
      return;
    }

    this.employerService
      .myJobs()
      .pipe(
        map((jobs) => jobs.find((job) => Number(job.job_id) === this.jobId) ?? null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (job) => {
          if (!job) {
            this.error.set('This job could not be found in your postings.');
          }
          this.jobState.set(job);
          if (job) {
            this.draft.set(draftFrom(job));
            if (shouldEdit) this.editMode.set(true);
          }
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.message(error, 'Failed to load this job'));
        },
      });
  }

  /** React's `location.state.job`, validated against the route id. */
  private readRouterState(): EmployerJob | null {
    const state = this.router.getCurrentNavigation()?.extras.state as { job?: EmployerJob } | null;
    const job = state?.job;
    if (job && Number(job.job_id) === this.jobId) {
      return job;
    }
    return null;
  }

  private shouldStartInEditMode(): boolean {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras.state ?? window.history.state) as { edit?: boolean } | null;
    return !!state?.edit || this.route.snapshot.queryParamMap.get('edit') === 'true';
  }

  /** Opens the inline form with a fresh copy of the stored posting. */
  startEdit(): void {
    const job = this.job();
    if (!job) return;
    this.draft.set(draftFrom(job));
    this.editMode.set(true);
  }

  /** Discards the draft and returns to read-only mode. */
  cancelEdit(): void {
    const job = this.job();
    if (job) this.draft.set(draftFrom(job));
    this.editMode.set(false);
  }

  onDraftChange(key: keyof JobDraftForm, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  /**
   * `PUT /api/employer/update/:job_id`, then re-reads the list so the page
   * shows the stored row (React's `handleUpdate` sequence).
   */
  save(event: Event): void {
    event.preventDefault();
    const job = this.job();
    if (!job || this.saving()) return;

    const draft = this.draft();
    if (!draft.title.trim() || !draft.description.trim() || !draft.location.trim()) {
      this.toast.error('Title, description and location are required.');
      return;
    }

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      location: draft.location.trim(),
      job_type: draft.job_type,
      salary_min: draft.salary_min === '' ? null : Number(draft.salary_min),
      salary_max: draft.salary_max === '' ? null : Number(draft.salary_max),
      skills: draft.skills
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    };

    this.saving.set(true);
    this.employerService
      .updateJob(job.job_id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.refreshAfterSave(job, payload),
        error: (error: unknown) => {
          this.saving.set(false);
          this.toast.error(this.message(error, 'Failed to update job'));
        },
      });
  }

  /** Re-reads `my-jobs` after a save so the page shows the stored row. */
  private refreshAfterSave(
    job: EmployerJob,
    payload: {
      title: string;
      description: string;
      location: string;
      job_type: string;
      salary_min: number | null;
      salary_max: number | null;
      skills: string[];
    },
  ): void {
    const applySuccess = (next: EmployerJob): void => {
      this.jobState.set(next);
      this.draft.set(draftFrom(next));
      this.saving.set(false);
      this.editMode.set(false);
      this.toast.success('Job updated successfully.');
    };

    this.employerService
      .myJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          const refreshed = jobs.find((item) => Number(item.job_id) === Number(job.job_id));
          applySuccess(refreshed ?? { ...job, ...payload });
        },
        error: () => applySuccess({ ...job, ...payload }),
      });
  }

  /** Flips the posting between `open` and `closed`. */
  toggleStatus(job: EmployerJob): void {
    const next = job.status === 'open' ? 'closed' : 'open';
    this.busy.set(true);
    this.employerService
      .updateJobStatus(job.job_id, { status: next })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.jobState.update((current) => (current ? { ...current, status: next } : current));
          this.toast.success(`Job ${next}.`);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.toast.error(this.message(error, 'Failed to update job status'));
        },
      });
  }

  /** Deletes the posting and returns to the list. */
  remove(jobId: number): void {
    this.busy.set(true);
    this.employerService
      .deleteJob(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success('Job deleted.');
          void this.router.navigate(['/employer/my-jobs']);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.confirming.set(false);
          this.toast.error(this.message(error, 'Failed to delete job'));
        },
      });
  }

  salary(job: EmployerJob): string {
    return formatSalary(job.salary_min, job.salary_max);
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
