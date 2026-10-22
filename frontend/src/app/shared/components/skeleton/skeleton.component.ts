import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

/** Shapes a skeleton can take, so loading states match what replaces them. */
export type SkeletonVariant = 'card' | 'table' | 'row' | 'title' | 'text' | 'circle';

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  card: 'h-56 w-full glass-card animate-pulse border-[#EFE9DD]',
  table: 'h-64 w-full rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] animate-pulse',
  row: 'h-12 w-full rounded-lg bg-[#FAF8F3] animate-pulse',
  title: 'h-8 w-2/3 rounded-lg bg-[#FAF8F3] animate-pulse',
  text: 'h-4 w-full rounded bg-[#FAF8F3] animate-pulse',
  circle: 'h-12 w-12 rounded-full bg-[#FAF8F3] animate-pulse',
};

/**
 * Pulsing placeholder shown while content loads.
 *
 * Kept as a component (rather than a class string reused everywhere) so loading
 * states stay consistent and can be swapped for a real design in one place.
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `<div class="loading-pulse" [ngClass]="classes()"></div>`,
})
export class SkeletonComponent {
  /** Which placeholder shape to draw. */
  readonly variant = input<SkeletonVariant>('card');

  /** Caller-supplied extras (spacing/width overrides). */
  readonly className = input('');

  /** Variant classes plus the caller's extras. */
  readonly classes = computed(() => `${VARIANT_CLASSES[this.variant()]} ${this.className()}`.trim());
}
