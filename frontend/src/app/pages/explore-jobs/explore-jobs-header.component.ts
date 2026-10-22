import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Explore page header: title, blurb and the "N verified jobs" pill.
 *
 * Reads only primitives so it can render identically in loading and loaded
 * states without knowing anything about jobs.
 */
@Component({
  selector: 'app-explore-jobs-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-2">
          <app-icon class="text-brand-accent" name="briefcase" [size]="28" />
          Explore Jobs
        </h1>
        <p class="text-text-muted mt-1">
          Browse verified openings published on the platform.
        </p>
      </div>
      <span
        class="inline-flex items-center px-3 py-1 rounded-full border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase tracking-widest"
      >
        {{ loading() ? 'Loading...' : resultCount() + ' verified jobs' }}
      </span>
    </div>
  `,
})
export class ExploreJobsHeaderComponent {
  /** True while the job list is still loading. */
  readonly loading = input(false);

  /** Number of jobs currently shown. */
  readonly resultCount = input(0);
}
