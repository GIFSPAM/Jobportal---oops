import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EmployerService } from '../../core/employer/employer.service';
import { JobDraft } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import { PageContainerComponent } from '../../shared';
import { EmployerJobFormComponent } from './employer-job-form.component';

/**
 * `/employer/my-jobs/new`: the plan's `PostJobPage`.
 *
 * The form owns validation; this page only maps the resulting draft onto
 * `POST /api/employer/post` and routes to the list on success.
 */
@Component({
  selector: 'app-employer-post-job-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageContainerComponent, EmployerJobFormComponent],
  template: `
    <app-page-container maxWidthClass="max-w-4xl">
      <header class="page-enter">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
        <h1 class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24]">
          Post a Job
        </h1>
        <p class="mt-3 text-text-muted">
          Publish a new opening; it goes public after admin verification.
        </p>
      </header>

      <div class="glass-card p-6 md:p-8 mt-6">
        <app-employer-job-form
          [submitting]="submitting()"
          submitLabel="Post Job"
          (submitted)="publish($event)"
        />
      </div>

      <a
        routerLink="/employer/my-jobs"
        class="inline-flex items-center gap-2 mt-6 text-sm font-bold text-[#6B6459] hover:text-[#D4622A] transition-colors"
      >
        ← Back to my jobs
      </a>
    </app-page-container>
  `,
})
export class EmployerPostJobPage {
  private readonly employerService = inject(EmployerService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);

  /** `POST /api/employer/post`, then routes to the postings list. */
  publish(draft: JobDraft): void {
    if (this.submitting()) return;

    this.submitting.set(true);
    this.employerService
      .createJob(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobId) => {
          this.submitting.set(false);
          this.toast.success('Job posted successfully.');
          // React routes back to the list; the id keeps the redirect explicit.
          void this.router.navigate(['/employer/my-jobs'], {
            state: { postedJobId: jobId },
          });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.toast.error(this.message(error, 'Failed to post job'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
