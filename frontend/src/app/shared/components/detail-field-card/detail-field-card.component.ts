import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

/**
 * One labelled read-only field inside a detail tile grid.
 *
 * Splits the label styling from the value styling so detail pages stay
 * declarative and every field on the portal looks identical.
 */
@Component({
  selector: 'app-detail-field-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `
    <div class="rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] p-4" [ngClass]="className()">
      <p class="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">{{ label() }}</p>
      <div class="text-text-main font-medium wrap-break-word">{{ value() }}</div>
    </div>
  `,
})
export class DetailFieldCardComponent {
  /** Field caption (shown above the value). */
  readonly label = input.required<string>();

  /** Field value; empty renders as a blank row rather than "undefined". */
  readonly value = input<string | number>('');

  /** Optional grid/spacing classes supplied by the host page. */
  readonly className = input('');
}
