import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * 270° gauge showing how well a seeker matches a job.
 *
 * Geometry, thresholds (<33% red, <66% yellow, else green) and the centred
 * percentage read-out are ported 1:1 from the React `JobMatchCircle` so the
 * same data always renders the same arc and colour.
 */
@Component({
  selector: 'app-job-match-circle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-2">
      <div class="relative" [style.width.px]="size()" [style.height.px]="size()">
        <svg [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
          <path
            [attr.d]="arcPath()"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            [attr.stroke-width]="strokeWidth()"
            stroke-linecap="round"
          />
          <path
            [attr.d]="arcPath()"
            fill="none"
            [attr.stroke]="color()"
            [attr.stroke-width]="strokeWidth()"
            [attr.stroke-dasharray]="dashArray()"
            stroke-linecap="round"
            class="match-progress"
          />
        </svg>
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center"
        >
          <div class="text-xl font-bold" [style.color]="color()">{{ roundedPercentage() }}%</div>
          <div class="text-xs text-text-muted">Match</div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .match-progress {
      transition: stroke-dasharray 0.5s ease, stroke 0.5s ease;
    }
  `,
})
export class JobMatchCircleComponent {
  /** Match score in percent; clamped to 0–100 and defaulted to 0 when invalid. */
  readonly matchPercentage = input(0);

  /** Diameter of the gauge in pixels. */
  readonly size = input(120);

  /** Thickness of the arc in pixels. */
  readonly strokeWidth = input(8);

  /** Clamped percentage used for both the arc and the label. */
  readonly percentage = computed(() => {
    const raw = this.matchPercentage();
    const safe = Number.isFinite(raw) ? raw : 0;
    return Math.min(Math.max(safe, 0), 100);
  });

  /** Score rounded for display (matches `Math.round` in the React version). */
  readonly roundedPercentage = computed(() => Math.round(this.percentage()));

  /** Traffic-light colour for the current score. */
  readonly color = computed(() => {
    const percent = this.percentage();
    if (percent < 33) {
      return '#ef4444';
    }
    if (percent < 66) {
      return '#eab308';
    }
    return '#22c55e';
  });

  /** Path of the 270° track (sweeps from 135° to 45°). */
  readonly arcPath = computed(() => {
    const center = this.size() / 2;
    const radius = (this.size() - this.strokeWidth()) / 2;
    const start = this.toCartesian(135, center, radius);
    const end = this.toCartesian(45, center, radius);
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${end.x} ${end.y}`;
  });

  /** `stroke-dasharray` pairs that reveal the score along the track. */
  readonly dashArray = computed(() => {
    const radius = (this.size() - this.strokeWidth()) / 2;
    const arcLength = 1.5 * Math.PI * radius;
    const progressLength = (this.percentage() / 100) * arcLength;
    return `${progressLength} ${arcLength}`;
  });

  /** Converts a degrees-on-circle value into SVG coordinates. */
  private toCartesian(angleDeg: number, center: number, radius: number): { x: number; y: number } {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(angleRad),
      y: center + radius * Math.sin(angleRad),
    };
  }
}
