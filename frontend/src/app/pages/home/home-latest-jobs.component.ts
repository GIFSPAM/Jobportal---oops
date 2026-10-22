import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../../core/models/job';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { JobCardComponent } from '../../shared/components/job-card/job-card.component';

/** Placeholder card indices shown while the landing jobs are loading. */
const SKELETONS = [1, 2, 3, 4, 5, 6];

/**
 * "Latest Openings" band on the home page.
 *
 * Purely presentational: it renders whatever list it is given and swaps in
 * pulsing skeletons while loading, so the home page owns all data concerns.
 */
@Component({
  selector: 'app-home-latest-jobs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, JobCardComponent],
  template: `
    <section class="py-24 px-6 border-t border-[#D8D2C4] bg-white page-enter">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div>
            <h2 class="text-4xl font-display font-bold text-[#1F2A24] mb-3">Latest Openings</h2>
            <p class="text-text-muted">
              Explore the most recent opportunities added to our platform.
            </p>
          </div>
          <a
            routerLink="/explore-jobs"
            class="text-brand-accent font-bold text-sm flex items-center gap-2 group"
          >
            Browse All
            <app-icon class="group-hover:translate-x-1 transition-transform" name="arrow-right" [size]="16" />
          </a>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          @if (loading()) {
            @for (skeleton of skeletons; track skeleton) {
              <div class="h-56 glass-card animate-pulse border-[#EFE9DD]"></div>
            }
          } @else {
            @for (job of jobs(); track job.id) {
              <app-job-card [job]="job" />
            }
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeLatestJobsSectionComponent {
  /** Jobs to display (already mapped by the home page). */
  readonly jobs = input<Job[]>([]);

  /** True while the landing jobs request is in flight. */
  readonly loading = input(false);

  /** Skeleton placeholders rendered during loading. */
  readonly skeletons = SKELETONS;
}
