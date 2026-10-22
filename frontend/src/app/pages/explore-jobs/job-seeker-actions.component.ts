import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Apply/Save buttons rendered in a job card's footer slot on the explore page.
 *
 * Encodes the whole "what state is this job in for me" matrix (closed, already
 * applied, saved, busy) as inputs so the page only has to track ids.
 */
@Component({
  selector: 'app-explore-job-seeker-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2">
      <button
        type="button"
        (click)="onApply()"
        [disabled]="applying() || isApplied()"
        [attr.aria-disabled]="isClosed()"
        [class]="applyClass()"
      >
        {{ applyLabel() }}
      </button>
      <button
        type="button"
        (click)="toggleSave.emit()"
        [disabled]="saving()"
        [class]="saveClass()"
      >
        {{ saving() ? 'Saving...' : isSaved() ? 'Saved' : 'Save' }}
      </button>
    </div>
  `,
})
export class ExploreJobSeekerActionsComponent {
  /** True once the signed-in seeker already applied. */
  readonly isApplied = input(false);

  /** True when the job is closed (disables applying). */
  readonly isClosed = input(false);

  /** True once the job is in the seeker's saved list. */
  readonly isSaved = input(false);

  /** True while the apply request is in flight. */
  readonly applying = input(false);

  /** True while the save/unsave request is in flight. */
  readonly saving = input(false);

  /** Emits a request to apply; suppressed while closed or already applied. */
  readonly apply = output<void>();

  /** Emits a request to toggle the saved state. */
  readonly toggleSave = output<void>();

  /** Styling matrix for the apply button (closed/applied/available). */
  readonly applyClass = (): string => {
    const base =
      'inline-flex items-center justify-center px-3 py-2 rounded-lg border text-xs font-bold transition-all disabled:opacity-60';
    if (this.isClosed()) {
      return `${base} border-[#E8E3D8] bg-[#FAF8F3] text-text-muted cursor-not-allowed hover:bg-[#FAF8F3]`;
    }
    if (this.isApplied()) {
      return `${base} border-green-500/20 bg-green-500/10 text-green-700 hover:bg-green-500/15`;
    }
    return `${base} border-brand-accent/20 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/15`;
  };

  /** Styling matrix for the save button (saved/unsaved). */
  readonly saveClass = (): string => {
    const base =
      'inline-flex items-center justify-center px-3 py-2 rounded-lg border text-xs font-bold transition-all disabled:opacity-60';
    return this.isSaved()
      ? `${base} border-yellow-500/20 bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/15`
      : `${base} border-[#E8E3D8] bg-[#FAF8F3] text-text-main hover:bg-[#F3ECE0]`;
  };

  /** Button copy for the apply button across all of its states. */
  readonly applyLabel = (): string => {
    if (this.isClosed()) {
      return 'Apply (Closed)';
    }
    if (this.applying()) {
      return 'Applying...';
    }
    return this.isApplied() ? 'Applied' : 'Apply';
  };

  /** Ignores clicks on a closed job instead of firing a doomed request. */
  onApply(): void {
    if (this.isClosed()) {
      return;
    }
    this.apply.emit();
  }
}
