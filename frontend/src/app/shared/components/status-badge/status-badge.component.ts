import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

/** Which badge family to render — each has its own copy and palette. */
export type StatusBadgeVariant = 'job' | 'verification' | 'application';

/** Neutral fallback used when the underlying value is missing/unknown. */
const NEUTRAL_CLASSES = 'text-text-muted bg-[#FAF8F3] border-[#E8E3D8]';

const APPLICATION_CLASSES: Record<string, string> = {
  // 700-level text on the 10%-tint fills: the React original was dark-themed,
  // where 400-level colours read cleanly, but on white they fall below ~2:1.
  applied: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  shortlisted: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  hired: 'bg-green-500/10 text-green-700 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
};

/** Title-cases a snake/lowercase status so pills read like the React app. */
function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Compact status pill used by job cards, application lists and admin tables.
 *
 * One component owns all three badge vocabularies (open/closed, verified/
 * unverified, application states) so their colours can never drift apart.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `<span class="inline-block" [ngClass]="classes()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  /** Which badge family to render. */
  readonly variant = input.required<StatusBadgeVariant>();

  /** Raw value (`'open'`, `'true'`, `'shortlisted'`, …); empty means unknown. */
  readonly value = input('');

  /** Display text — `Open`/`Closed`, `Verified`/`Unverified`, `Applied`… */
  readonly label = computed(() => {
    const raw = this.value().trim().toLowerCase();
    if (!raw) {
      return this.variant() === 'verification' ? 'Unknown' : 'Not specified';
    }

    switch (this.variant()) {
      case 'job':
        return raw === 'open' ? 'Open' : 'Closed';
      case 'verification':
        return this.isTruthy(raw) ? 'Verified' : 'Unverified';
      case 'application':
        return humanize(raw);
    }
  });

  /** Colour/border classes paired with the label. */
  readonly classes = computed(() => {
    const raw = this.value().trim().toLowerCase();
    const base =
      this.variant() === 'application'
        ? 'px-3 py-1 rounded-full border text-xs font-bold capitalize'
        : 'px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider';

    if (!raw) {
      return `${base} ${NEUTRAL_CLASSES}`;
    }

    switch (this.variant()) {
      case 'job':
        return raw === 'open'
          ? `${base} text-green-700 bg-green-500/15 border-green-500/30`
          : `${base} ${NEUTRAL_CLASSES}`;
      case 'verification':
        return this.isTruthy(raw)
          ? `${base} text-brand-accent bg-brand-accent/10 border-brand-accent/25`
          : `${base} text-yellow-700 bg-yellow-500/10 border-yellow-500/25`;
      case 'application':
        return `${base} ${APPLICATION_CLASSES[raw] ?? NEUTRAL_CLASSES}`;
    }
  });

  /** Accepts `true`/`1`/`verified` so any backend spelling maps correctly. */
  private isTruthy(raw: string): boolean {
    return raw === 'true' || raw === '1' || raw === 'verified';
  }
}
