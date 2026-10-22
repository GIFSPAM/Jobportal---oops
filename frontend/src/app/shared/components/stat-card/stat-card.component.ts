import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { IconComponent, IconName } from '../icon/icon.component';

/**
 * Single KPI tile used across the seeker/employer/admin dashboards.
 *
 * The `index` input drives the stagger delay so a row of cards animates in one
 * after another exactly like the React `StatCard` (delay = index × 70ms).
 */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgClass],
  template: `
    <div class="glass-card p-6 flex items-center gap-5 page-enter" [ngClass]="staggerClass()">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center" [ngClass]="colorClass()">
        <app-icon [name]="icon()" [size]="20" />
      </div>
      <div>
        <p class="text-2xl font-display font-bold text-text-main">{{ loading() ? '–' : value() }}</p>
        <p class="text-xs text-text-muted font-bold uppercase tracking-widest">{{ label() }}</p>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  /** Caption under the number. */
  readonly label = input.required<string>();

  /** The metric itself; rendered as `–` while `loading` is true. */
  readonly value = input<string | number>('');

  /** Glyph drawn in the coloured square. */
  readonly icon = input<IconName>('layout-dashboard');

  /**
   * Tailwind classes defining the tile's accent colour.
   *
   * Defaults to the neutral token rather than the React original's
   * `text-white`: cards are white in this theme, so white-on-white would be
   * invisible wherever a caller does not pass a colour.
   */
  readonly colorClass = input('bg-[#FAF8F3] text-text-muted');

  /** True while the real number is still being fetched. */
  readonly loading = input(false);

  /** Zero-based position in the row — controls the entrance delay. */
  readonly index = input(0);

  /** `stagger-n` helper class from the global stylesheet. */
  readonly staggerClass = computed(() => {
    const index = this.index();
    return index > 0 ? `stagger-${Math.min(index, 8)}` : '';
  });
}
