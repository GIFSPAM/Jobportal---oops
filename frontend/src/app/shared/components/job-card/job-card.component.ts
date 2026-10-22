import { ChangeDetectionStrategy, Component, Directive, computed, contentChild, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../../../core/models/job';
import { assetUrl } from '../../../core/http/asset-url';
import { JobTypePipe } from '../../pipes/job-type.pipe';
import { IconComponent } from '../icon/icon.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/**
 * Marks an element projected into the card's top-right meta slot.
 *
 * Consumers write `<div metaBadge>…</div>` (or the attribute on any projected
 * element); while present it replaces the default job-type pill and badges.
 */
@Directive({ selector: '[metaBadge]', standalone: true })
export class MetaBadgeDirective {}

/**
 * Marks the content projected into the card's footer action strip.
 *
 * The strip (and its divider) only renders while this attribute is present, so
 * list pages can opt into per-card actions without a second flag input.
 */
@Directive({ selector: '[footerActions]', standalone: true })
export class FooterActionsDirective {}

/** Default company avatar when a job carries no profile picture (as in React). */
const DEFAULT_LOGO = '/logos/google.png';

/**
 * Job preview card used by every job grid on the portal.
 *
 * Owns the click-through to the job detail page (stretched-link pattern, so the
 * whole card is clickable while nested links stay independently reachable by
 * keyboard) and the meta/footer content slots; list pages only supply data.
 */
@Component({
  selector: 'app-job-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, StatusBadgeComponent, JobTypePipe],
  template: `
    <article
      class="glass-card p-8 flex flex-col justify-between group transition-all border-[#D8D2C4] relative bg-white shadow-sm"
      [class.cursor-pointer]="clickable()"
      [class.cursor-default]="!clickable()"
    >
      <div class="flex items-start justify-between mb-8">
        <div
          class="w-14 h-14 rounded-2xl bg-white border border-[#D8D2C4] shadow-sm flex items-center justify-center overflow-hidden p-2"
        >
          <img
            [src]="logoSrc()"
            class="w-full h-full object-contain"
            alt=""
            referrerpolicy="no-referrer"
          />
        </div>
        <div class="flex flex-col items-end gap-2">
          @if (hasMetaBadge()) {
            <ng-content select="[metaBadge]" />
          } @else {
            <div
              class="chip-parchment uppercase tracking-wider text-[11px] font-bold"
            >
              {{ job().type | jobType }}
            </div>
            <div class="flex items-center gap-2 flex-wrap justify-end">
              <app-status-badge variant="job" [value]="job().status ?? 'closed'" />
              <app-status-badge variant="verification" [value]="verificationValue()" />
            </div>
          }
        </div>
      </div>

      <div>
        <h3
          class="text-xl font-bold text-[#1F2A24] mb-2 transition-colors group-hover:text-[#D4622A]"
        >
          @if (clickable()) {
            <a
              [routerLink]="['/jobs', job().id]"
              class="text-[#1F2A24] group-hover:text-[#D4622A] transition-colors after:absolute after:inset-0 after:content-['']"
            >
              {{ job().title }}
            </a>
          } @else {
            {{ job().title }}
          }
        </h3>
        @if (job().employerId) {
          <a
            [routerLink]="['/employers', job().employerId]"
            [queryParams]="{ jobId: job().id }"
            class="relative z-10 text-text-muted font-medium mb-8 inline-flex items-center gap-1.5 hover:text-[#D4622A] transition-colors"
          >
            <app-icon name="building" [size]="16" />
            {{ job().company }}
          </a>
        } @else {
          <p class="text-text-muted font-medium mb-8">{{ job().company }}</p>
        }
      </div>

      <div
        class="flex items-center justify-between pt-6 border-t border-[#D8D2C4] text-sm text-text-muted"
      >
        <div class="flex items-center gap-2">
          <app-icon name="map-pin" [size]="16" />
          {{ job().location }}
        </div>
        <div class="flex items-center gap-2 font-bold text-[#1F2A24]">
          <app-icon name="dollar-sign" [size]="16" />
          {{ job().salary }}
        </div>
      </div>

      @if (hasFooterActions()) {
        <div class="relative z-10 pt-4 mt-4 border-t border-[#D8D2C4]">
          <ng-content select="[footerActions]" />
        </div>
      }
    </article>
  `,
})
export class JobCardComponent {
  /** Job to render; required so a card can never silently render empty data. */
  readonly job = input.required<Job>();

  /** False for grids where navigation is handled elsewhere (e.g. detail views). */
  readonly clickable = input(true);

  /** Projected custom meta badge, when the caller supplied one. */
  private readonly metaBadge = contentChild(MetaBadgeDirective);

  /** Projected footer actions, when the caller supplied them. */
  private readonly footerActions = contentChild(FooterActionsDirective);

  /** Avatar URL with the shared fallback applied. */
  readonly logoSrc = computed(() => assetUrl(this.job().logo) || DEFAULT_LOGO);

  /** `''` when the backend sent no verification flag so the badge renders "Unknown". */
  readonly verificationValue = computed(() => {
    const verified = this.job().isVerified;
    return verified === undefined ? '' : String(verified);
  });

  /** Whether a custom meta badge was projected into the top-right slot. */
  readonly hasMetaBadge = computed(() => this.metaBadge() !== undefined);

  /** Whether a footer action strip was projected. */
  readonly hasFooterActions = computed(() => this.footerActions() !== undefined);
}
