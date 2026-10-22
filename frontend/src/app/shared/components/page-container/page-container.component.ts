import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Standard page shell: top padding for the floating nav, centered max-width
 * column and consistent vertical rhythm.
 *
 * Every routed page wraps its content in this so spacing is decided once here
 * instead of drifting page by page (mirrors the React `PageContainer`).
 */
@Component({
  selector: 'app-page-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pt-28 pb-16 px-6 min-h-screen">
      <div [class]="containerClass()"><ng-content /></div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PageContainerComponent {
  /** Tailwind max-width utility for the inner column. */
  readonly maxWidthClass = input('max-w-6xl');

  /** Spacing utility applied to the inner column (usually `space-y-*`). */
  readonly contentClassName = input('space-y-8');

  /** Combined classes bound to the inner column. */
  readonly containerClass = computed(
    () => `${this.maxWidthClass()} mx-auto ${this.contentClassName()}`,
  );
}
