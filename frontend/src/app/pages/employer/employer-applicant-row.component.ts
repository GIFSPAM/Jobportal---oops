import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { EmployerApplicant } from '../../core/models/employer';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent, IconComponent, DatePipe } from '../../shared';

/**
 * Single applicant row in an employer's table.
 *
 * Shared by {@link EmployerApplicationsPage} ("All Applications" tab) and
 * {@link EmployerJobApplicantsPage} (per-job list). The two callers differ
 * only in which extra column they show — the job title or the candidate's
 * experience years — so this component renders the common columns and lets
 * the parent project the optional ones via `showJobTitle` / `showExperience`.
 */
@Component({
  selector: 'app-employer-applicant-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent, IconComponent, DatePipe],
  template: `
    <tr class="hover:bg-[#FAF8F3] transition-colors">
      <td class="py-4 px-2">
        <a
          [routerLink]="['/employer/applications', applicant().application_id]"
          [state]="{ application: withJobContext(applicant()) }"
          class="font-medium text-[#1F2A24] hover:text-[#D4622A] transition-colors"
        >
          {{ applicant().seeker.full_name || 'Unknown candidate' }}
        </a>
        <p class="text-xs text-text-muted mt-1">
          {{ applicant().seeker.education || 'Education not available' }}
        </p>
      </td>

      @if (showJobTitle()) {
        <td class="py-4 px-2">
          <a
            [routerLink]="['/employer/applications/job', applicant().job_id]"
            [state]="{ jobTitle: applicant().job_title }"
            class="hover:text-[#D4622A] transition-colors"
          >
            {{ applicant().job_title }}
          </a>
          <p class="text-xs text-text-muted mt-1">Job ID: {{ applicant().job_id }}</p>
        </td>
      }

      <td class="py-4 px-2">
        <app-status-badge variant="application" [value]="applicant().application_status" />
      </td>

      @if (showExperience()) {
        <td class="py-4 px-2 text-text-muted">
          {{ applicant().seeker.experience_years ?? 0 }} yrs
        </td>
      }

      <td class="py-4 px-2 text-text-muted">
        {{ applicant().applied_at | appDate }}
      </td>

      <td class="py-4 px-2">
        @if (applicant().seeker.resume_url) {
          <button
            type="button"
            (click)="onDownload(applicant().application_id); $event.stopPropagation()"
            [disabled]="downloadingId() === applicant().application_id"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-accent/30 bg-brand-accent/10 text-xs font-bold text-brand-accent hover:bg-brand-accent/20 transition-all disabled:opacity-60"
          >
            <app-icon name="file-text" [size]="14" />
            {{ downloadingId() === applicant().application_id ? 'Preparing…' : 'Resume' }}
          </button>
        } @else {
          <span class="text-xs text-text-muted">N/A</span>
        }
      </td>

      <td class="py-4 px-2">
        <a
          [routerLink]="['/employer/applications', applicant().application_id]"
          [state]="{ application: withJobContext(applicant()) }"
          class="text-xs font-semibold text-text-muted hover:text-[#D4622A] transition-colors"
        >
          View Detail
        </a>
      </td>
    </tr>
  `,
})
export class EmployerApplicantRowComponent {
  /** The applicant data for this row. */
  readonly applicant = input.required<EmployerApplicant>();

  /** Whether to render the job-title column (employer-applications "All Applications" tab). */
  readonly showJobTitle = input(false);

  /** Whether to render the experience-years column (employer-job-applicants page). */
  readonly showExperience = input(false);

  /** ID of the applicant whose resume download is in flight (parent-controlled). */
  readonly downloadingId = input<number | null>(null);

  /** Emits when the resume download button is clicked. */
  readonly download = output<number>();

  /** Adds job context for the detail page — mirrors the React `withJobContext`. */
  withJobContext(applicant: EmployerApplicant): EmployerApplicant & { jobTitle: string } {
    return {
      ...applicant,
      jobTitle: applicant.job_title ?? 'Untitled Job',
    };
  }

  onDownload(id: number): void {
    this.download.emit(id);
  }
}