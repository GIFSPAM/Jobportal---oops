import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EmployerService } from '../../core/employer/employer.service';
import { EmployerProfile, JobDraft } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent, PageContainerComponent, SkeletonComponent } from '../../shared';
import { EmployerJobFormComponent } from './employer-job-form.component';

/**
 * `/employer/my-jobs/new`: the plan's `PostJobPage`.
 *
 * CRN is mandatory after initial registration before posting any jobs.
 */
@Component({
  selector: 'app-employer-post-job-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageContainerComponent, EmployerJobFormComponent, IconComponent, SkeletonComponent],
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

      @if (loading()) {
        <div class="glass-card p-6 mt-6 space-y-4">
          <app-skeleton variant="text" />
          <app-skeleton variant="text" />
        </div>
      } @else if (!hasCrn()) {
        <div class="glass-card p-8 mt-6 border-amber-300 bg-amber-50/70 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-800 flex items-center justify-center mx-auto">
            <app-icon name="shield-check" [size]="28" />
          </div>
          <h2 class="text-xl font-display font-bold text-amber-950">
            Company Registration Number (CRN) Required
          </h2>
          <p class="text-sm text-amber-800 max-w-md mx-auto">
            A valid CRN is mandatory after initial registration so administrators can monitor and verify your company existence before approving job postings.
          </p>
          <div>
            <a
              routerLink="/employer/profile"
              class="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold shadow-md"
            >
              Update CRN in Company Profile →
            </a>
          </div>
        </div>
      } @else {
        <div class="glass-card p-6 md:p-8 mt-6">
          <app-employer-job-form
            [submitting]="submitting()"
            submitLabel="Post Job"
            (submitted)="publish($event)"
          />
        </div>
      }

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

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly profile = signal<EmployerProfile | null>(null);

  readonly hasCrn = () => Boolean(this.profile()?.crn?.trim());

  constructor() {
    this.employerService
      .profile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  /** `POST /api/employer/post`, then routes to the postings list. */
  publish(draft: JobDraft): void {
    if (this.submitting()) return;

    if (!this.hasCrn()) {
      this.toast.error('Company Registration Number (CRN) is mandatory before posting jobs.');
      return;
    }

    this.submitting.set(true);
    this.employerService
      .createJob(draft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobId) => {
          this.submitting.set(false);
          this.toast.success('Job posted successfully.');
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
