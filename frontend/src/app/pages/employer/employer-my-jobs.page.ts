import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EmployerService } from '../../core/employer/employer.service';
import { EmployerJob } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import {
  JobTypePipe,
  PageContainerComponent,
  SkeletonComponent,
  StatusBadgeComponent,
  DatePipe,
} from '../../shared';

/** Column headers of the postings table. */
const COLUMNS = ['Job', 'Applicants', 'Status', 'Verification', 'Posted', 'Actions'];

/**
 * `/employer/my-jobs`: manage every posting — status, edit, applicants, delete.
 *
 * Delete uses the plan's two-step confirm (the row turns into "Sure?" inline),
 * so no modal is needed and keyboard users keep focus where they are.
 */
@Component({
  selector: 'app-employer-my-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageContainerComponent,
    StatusBadgeComponent,
    SkeletonComponent,
    JobTypePipe,
    DatePipe,
  ],
  template: `
    <app-page-container maxWidthClass="max-w-7xl">
      <header class="page-enter flex items-end justify-between flex-wrap gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
          <h1 class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24]">My Jobs</h1>
          <p class="mt-3 text-text-muted">Manage the roles your company has posted.</p>
        </div>
        <a
          routerLink="/employer/my-jobs/new"
          class="btn-primary px-6 py-3 rounded-full text-sm font-bold"
        >
          Post a job
        </a>
      </header>

      @if (loading()) {
        <div class="glass-card p-6 mt-6 space-y-3">
          @for (row of rows; track row) {
            <app-skeleton variant="row" />
          }
        </div>
      } @else if (error()) {
        <div class="glass-card p-8 mt-6 text-center text-red-500">{{ error() }}</div>
      } @else if (jobs().length === 0) {
        <div class="glass-card p-10 mt-6 text-center">
          <p class="text-text-muted">You have not posted any jobs yet.</p>
          <a
            routerLink="/employer/my-jobs/new"
            class="btn-primary inline-block mt-5 px-6 py-3 rounded-full text-sm"
          >
            Post your first job
          </a>
        </div>
      } @else {
        <div class="glass-card mt-6 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-[#D8D2C4] text-[10px] uppercase tracking-widest text-text-muted">
                @for (column of columns; track column) {
                  <th class="px-5 py-4 font-bold">{{ column }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (job of jobs(); track job.job_id) {
                <tr
                  class="border-b border-[#EFE9DD] last:border-0 hover:bg-[#FAF8F3] transition-colors cursor-pointer group"
                  (click)="goToJob(job)"
                >
                  <td class="px-5 py-4">
                    <a
                      [routerLink]="['/employer/my-jobs', job.job_id]"
                      [state]="{ job: job }"
                      (click)="$event.stopPropagation()"
                      class="font-bold text-[#1F2A24] group-hover:text-[#D4622A] transition-colors"
                    >
                      {{ job.title || 'Untitled role' }}
                    </a>
                    <p class="text-xs text-text-muted mt-1">
                      {{ job.location }} · {{ job.job_type | jobType }}
                      @if (job.crn) {
                        · <span class="font-semibold text-[#1F2A24]">CRN: {{ job.crn }}</span>
                      }
                    </p>
                  </td>
                  <td class="px-5 py-4">
                    <a
                      [routerLink]="['/employer/applications/job', job.job_id]"
                      (click)="$event.stopPropagation()"
                      class="inline-flex items-center justify-center min-w-8 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 font-bold text-xs text-brand-accent hover:bg-brand-accent hover:text-white active:scale-95 transition-all shadow-sm"
                    >
                      {{ job.applicant_count }}
                    </a>
                  </td>
                  <td class="px-5 py-4">
                    <button
                      type="button"
                      (click)="toggleStatus(job); $event.stopPropagation()"
                      [disabled]="busyId() === job.job_id"
                      title="Click to open/close"
                      class="inline-block p-0.5 rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <app-status-badge variant="job" [value]="job.status" />
                    </button>
                  </td>
                  <td class="px-5 py-4">
                    <app-status-badge
                      variant="verification"
                      [value]="job.is_verified ? 'true' : 'false'"
                    />
                  </td>
                  <td class="px-5 py-4 text-text-muted whitespace-nowrap">
                    {{ job.posted_at | appDate }}
                  </td>
                  <td class="px-5 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2 text-xs font-bold">
                      <a
                        [routerLink]="['/employer/my-jobs', job.job_id]"
                        [state]="{ job: job, edit: true }"
                        (click)="$event.stopPropagation()"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-xs font-bold text-[#1F2A24] hover:bg-white hover:border-[#D4622A] hover:text-[#D4622A] active:scale-95 transition-all shadow-sm"
                      >
                        Edit
                      </a>
                      <a
                        [routerLink]="['/employer/applications/job', job.job_id]"
                        [state]="{ jobTitle: job.title || 'Untitled Job' }"
                        (click)="$event.stopPropagation()"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D8D2C4] bg-[#FAF8F3] text-xs font-bold text-[#1F2A24] hover:bg-white hover:border-[#D4622A] hover:text-[#D4622A] active:scale-95 transition-all shadow-sm"
                      >
                        Applicants
                      </a>
                      @if (confirmingId() === job.job_id) {
                        <button
                          type="button"
                          (click)="remove(job.job_id); $event.stopPropagation()"
                          [disabled]="busyId() === job.job_id"
                          class="inline-flex items-center px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                        >
                          {{ busyId() === job.job_id ? 'Deleting…' : 'Sure?' }}
                        </button>
                        <button
                          type="button"
                          (click)="confirmingId.set(null); $event.stopPropagation()"
                          class="inline-flex items-center px-3 py-1.5 rounded-full border border-[#D8D2C4] bg-white text-xs font-bold text-text-muted hover:text-[#1F2A24] active:scale-95 transition-all"
                        >
                          Cancel
                        </button>
                      } @else {
                        <button
                          type="button"
                          (click)="confirmingId.set(job.job_id); $event.stopPropagation()"
                          class="inline-flex items-center px-3 py-1.5 rounded-full border border-red-500/30 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 hover:border-red-500/50 active:scale-95 transition-all shadow-sm"
                        >
                          Delete
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </app-page-container>
  `,
})
export class EmployerMyJobsPage {
  private readonly employerService = inject(EmployerService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly jobs = signal<EmployerJob[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  /** Job awaiting delete confirmation. */
  readonly confirmingId = signal<number | null>(null);

  /** Job whose mutation is in flight. */
  readonly busyId = signal<number | null>(null);

  readonly columns = COLUMNS;
  readonly rows = [1, 2, 3, 4];

  constructor() {
    this.load();
  }

  goToJob(job: EmployerJob): void {
    void this.router.navigate(['/employer/my-jobs', job.job_id], {
      state: { job },
    });
  }

  /** Flips `open` ↔ `closed` via `PATCH /api/employer/status/:job_id`. */
  toggleStatus(job: EmployerJob): void {
    const next = job.status === 'open' ? 'closed' : 'open';
    this.busyId.set(job.job_id);
    this.employerService
      .updateJobStatus(job.job_id, { status: next as 'open' | 'closed' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.jobs.update((list) =>
            list.map((item) =>
              item.job_id === job.job_id ? { ...item, status: next } : item,
            ),
          );
          this.toast.success(`Job ${next}.`);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.error(this.message(error, 'Failed to update job status'));
        },
      });
  }

  /** Deletes a posting after the inline confirmation step. */
  remove(jobId: number): void {
    this.busyId.set(jobId);
    this.employerService
      .deleteJob(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.confirmingId.set(null);
          this.jobs.update((list) => list.filter((job) => job.job_id !== jobId));
          this.toast.success('Job deleted.');
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.confirmingId.set(null);
          this.toast.error(this.message(error, 'Failed to delete job'));
        },
      });
  }

  private load(): void {
    this.employerService
      .myJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.message(error, 'Failed to load your jobs'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
