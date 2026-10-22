import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Search/type/skill filter bar for the explore page.
 *
 * Purely presentational: every keystroke and selection is emitted upward so the
 * page keeps a single source of truth for the filter state (as in the React
 * `ExploreJobsFilters`).
 */
@Component({
  selector: 'app-explore-jobs-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="glass-card p-5">
      <div class="flex items-end gap-3 flex-wrap">
        <div class="space-y-1 flex-1 min-w-65">
          <label
            for="explore-search"
            class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
          >
            Search Jobs
          </label>
          <div class="relative">
            <app-icon
              class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
              name="search"
              [size]="16"
            />
            <input
              #searchEl
              id="explore-search"
              type="search"
              [value]="searchQuery()"
              (input)="searchChange.emit(searchEl.value)"
              placeholder="Title, company, location, type"
              class="input-field input-field-with-icon"
            />
          </div>
        </div>

        <div class="space-y-1 min-w-55">
          <label
            for="explore-type"
            class="text-[10px] font-bold uppercase tracking-widest text-text-muted inline-flex items-center gap-1"
          >
            <app-icon name="filter" [size]="14" /> Type
          </label>
          <select
            #typeEl
            id="explore-type"
            class="input-field h-12"
            [value]="jobTypeFilter()"
            (change)="jobTypeChange.emit(typeEl.value)"
          >
            @for (type of availableJobTypes(); track type) {
              <option [value]="type">{{ type === 'all' ? 'All Types' : type }}</option>
            }
          </select>
        </div>

        <div class="space-y-1 min-w-55">
          <label
            for="explore-skill"
            class="text-[10px] font-bold uppercase tracking-widest text-text-muted inline-flex items-center gap-1"
          >
            <app-icon name="filter" [size]="14" /> Skill
          </label>
          <select
            #skillEl
            id="explore-skill"
            class="input-field h-12"
            [value]="skillFilter()"
            (change)="skillChange.emit(skillEl.value)"
          >
            @for (skill of availableSkills(); track skill) {
              <option [value]="skill">{{ skill === 'all' ? 'All Skills' : skill }}</option>
            }
          </select>
        </div>
      </div>
    </div>
  `,
})
export class ExploreJobsFiltersComponent {
  /** Current free-text query. */
  readonly searchQuery = input('');

  /** Selected job type (`'all'` for no filter). */
  readonly jobTypeFilter = input('all');

  /** Selected skill (`'all'` for no filter). */
  readonly skillFilter = input('all');

  /** Job type options derived from the loaded list. */
  readonly availableJobTypes = input<string[]>(['all']);

  /** Skill options derived from the loaded list. */
  readonly availableSkills = input<string[]>(['all']);

  /** Emits the new search text on every keystroke. */
  readonly searchChange = output<string>();

  /** Emits the newly selected job type. */
  readonly jobTypeChange = output<string>();

  /** Emits the newly selected skill. */
  readonly skillChange = output<string>();
}
