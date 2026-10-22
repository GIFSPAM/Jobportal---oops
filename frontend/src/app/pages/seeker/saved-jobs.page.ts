import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SavedJob } from '../../core/models/seeker';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent, JobTypePipe, PageContainerComponent } from '../../shared';

/** Skeleton rows rendered while the list loads. */
const SKELETONS = [1, 2, 3];

/** Skills chips shown per row (matches React's `slice(0, 5)`). */
const SKILL_PREVIEW_LIMIT = 5;

/**
 * `/seeker/saved-jobs`: the seeker's bookmarked postings.
 *
 * Port of the React `SavedJobs` page — one card of stacked rows, each with the
 * company/location/type meta, up to five skill chips and View/Remove actions.
 */
@Component({
  selector: 'app-seeker-saved-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, JobTypePipe, PageContainerComponent],
  template: `
    <app-page-container>
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-2"
          >
            <app-icon name="bookmark" [size]="28" class="text-yellow-700" />
            Saved Jobs
          </h1>
          <p class="text-text-muted mt-1">Manage jobs you bookmarked for later.</p>
        </div>
        <span
          class="inline-flex items-center px-3 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-700 text-xs font-bold uppercase tracking-widest"
        >
          {{ loading() ? 'Loading...' : savedJobs().length + ' saved' }}
        </span>
      </div>

      <div class="glass-card p-8">
        @if (loading()) {
          <div class="space-y-3">
            @for (row of skeletons; track row) {
              <div class="h-16 rounded-xl bg-[#F1EDE4] animate-pulse"></div>
            }
          </div>
        } @else if (savedJobs().length === 0) {
          <p class="text-sm text-text-muted text-center py-8">No saved jobs yet.</p>
        } @else {
          <div class="space-y-3">
            @for (job of savedJobs(); track job.job_id) {
              <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-5">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <a
                      [routerLink]="['/jobs', job.job_id]"
                      class="text-[#1F2A24] font-semibold hover:text-[#D4622A] transition-colors"
                    >
                      {{ job.title ?? 'Untitled job' }}
                    </a>
                    <p class="text-xs text-text-muted mt-1 inline-flex items-center gap-2">
                      <app-icon name="building" [size]="14" />
                      {{ job.company_name ?? 'Unknown company' }}
                    </p>
                    <p class="text-xs text-text-muted mt-1 inline-flex items-center gap-2">
                      <app-icon name="map-pin" [size]="14" />
                      {{ job.location ?? 'Remote' }}
                    </p>
                    <p class="text-xs text-text-muted mt-1 inline-flex items-center gap-2">
                      <app-icon name="calendar" [size]="14" />
                      {{ job.job_type | jobType }}
                    </p>
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      @for (skill of skillPreview(job); track $index) {
                        <span
                          class="px-2 py-1 rounded-full border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-[10px] font-bold"
                        >
                          {{ skill }}
                        </span>
                      }
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <a
                      [routerLink]="['/jobs', job.job_id]"
                      class="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold hover:bg-brand-accent/15 transition-all"
                    >
                      View Job
                    </a>
                    <button
                      type="button"
                      (click)="remove(job.job_id)"
                      [disabled]="removingJobId() === job.job_id"
                      class="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 text-xs font-bold hover:bg-red-500/15 transition-all disabled:opacity-60"
                    >
                      <app-icon name="trash" [size]="14" />
                      {{ removingJobId() === job.job_id ? 'Removing...' : 'Remove' }}
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </app-page-container>
  `,
})
export class SeekerSavedJobsPage {
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Saved jobs currently listed. */
  readonly savedJobs = signal<SavedJob[]>([]);

  /** True until the list request settles. */
  readonly loading = signal(true);

  /** Job whose removal request is in flight. */
  readonly removingJobId = signal<number | null>(null);

  /** Skeleton rows shown while the list loads. */
  readonly skeletons = SKELETONS;

  constructor() {
    this.seekerService
      .savedJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (savedJobs) => {
          this.savedJobs.set(savedJobs);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to fetch saved jobs'));
        },
      });
  }

  /** First five skills of a row, matching the React preview. */
  skillPreview(job: SavedJob): string[] {
    const skills = Array.isArray(job.skills) ? job.skills : [];
    return skills.slice(0, SKILL_PREVIEW_LIMIT);
  }

  /** Removes a job from the saved list. */
  remove(jobId: number): void {
    if (!Number.isInteger(jobId) || jobId <= 0) {
      return;
    }

    this.removingJobId.set(jobId);
    this.seekerService
      .removeSavedJob(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removingJobId.set(null);
          this.savedJobs.update((list) => list.filter((job) => Number(job.job_id) !== jobId));
          this.toast.success('Removed from saved jobs.');
        },
        error: (error: unknown) => {
          this.removingJobId.set(null);
          this.toast.error(this.message(error, 'Failed to remove saved job'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
