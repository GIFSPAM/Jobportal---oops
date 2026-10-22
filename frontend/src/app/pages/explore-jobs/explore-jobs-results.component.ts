import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Job } from '../../core/models/job';
import { FooterActionsDirective, JobCardComponent } from '../../shared/components/job-card/job-card.component';
import { ExploreJobSeekerActionsComponent } from './job-seeker-actions.component';

/** Skeleton card indices shown while the list loads. */
const SKELETONS = [1, 2, 3, 4, 5, 6];

/**
 * Result grid of the explore page.
 *
 * Renders skeletons, an empty state or the job cards, and — for seekers —
 * projects an apply/save strip into each card's footer slot.
 */
@Component({
  selector: 'app-explore-jobs-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JobCardComponent, FooterActionsDirective, ExploreJobSeekerActionsComponent],
  template: `
    @if (loading()) {
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (skeleton of skeletons; track skeleton) {
          <div class="h-56 glass-card animate-pulse border-[#EFE9DD]"></div>
        }
      </div>
    } @else if (jobs().length === 0) {
      <div class="glass-card p-10 text-center">
        <p class="text-text-muted">No verified jobs match your filters right now.</p>
      </div>
    } @else {
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (job of jobs(); track job.id) {
          <app-job-card [job]="job">
            @if (showActions()) {
              <app-explore-job-seeker-actions
                footerActions
                [isApplied]="appliedJobIds().includes(job.id)"
                [isClosed]="isClosed(job)"
                [isSaved]="savedJobIds().includes(job.id)"
                [applying]="applyingJobId() === job.id"
                [saving]="savingJobId() === job.id"
                (apply)="applyRequested.emit(job.id)"
                (toggleSave)="saveRequested.emit(job.id)"
              />
            }
          </app-job-card>
        }
      </div>
    }
  `,
})
export class ExploreJobsResultsComponent {
  /** True while the job list is loading. */
  readonly loading = input(false);

  /** Filtered jobs to render. */
  readonly jobs = input<Job[]>([]);

  /** Whether to render the per-card apply/save strip (seekers only). */
  readonly showActions = input(false);

  /** Ids of jobs the seeker already applied to. */
  readonly appliedJobIds = input<number[]>([]);

  /** Ids of jobs the seeker saved. */
  readonly savedJobIds = input<number[]>([]);

  /** Id of the job whose apply request is in flight (if any). */
  readonly applyingJobId = input<number | null>(null);

  /** Id of the job whose save request is in flight (if any). */
  readonly savingJobId = input<number | null>(null);

  /** Emits when the seeker asks to apply for a job. */
  readonly applyRequested = output<number>();

  /** Emits when the seeker asks to toggle the saved state of a job. */
  readonly saveRequested = output<number>();

  /** Skeleton placeholders rendered while loading. */
  readonly skeletons = SKELETONS;

  /** Closed jobs cannot be applied to (matches the React status check). */
  isClosed(job: Job): boolean {
    return String(job.status ?? '').toLowerCase() === 'closed';
  }
}
