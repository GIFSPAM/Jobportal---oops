import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Names of the bundled (lucide-style) icons.
 *
 * The project ships no icon dependency, so the handful of glyphs the portal
 * needs live here as a typed registry: a typo becomes a compile error instead of
 * an invisible icon.
 */
export type IconName =
  | 'activity'
  | 'arrow-left'
  | 'arrow-right'
  | 'bookmark'
  | 'briefcase'
  | 'building'
  | 'calendar'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-right'
  | 'database'
  | 'dollar-sign'
  | 'eye'
  | 'eye-off'
  | 'file-text'
  | 'filter'
  | 'graduation-cap'
  | 'globe'
  | 'hard-hat'
  | 'home'
  | 'id-card'
  | 'key'
  | 'layout-dashboard'
  | 'lock'
  | 'log-in'
  | 'mail'
  | 'map-pin'
  | 'phone'
  | 'plus'
  | 'search'
  | 'search-x'
  | 'settings'
  | 'shield'
  | 'shield-check'
  | 'trash'
  | 'trending-up'
  | 'undo'
  | 'user'
  | 'user-plus'
  | 'users'
  | 'x'
  | 'x-circle'
  | 'zap';

/** Inner SVG markup for each icon (24×24 grid, `currentColor` stroke). */
const ICON_MARKUP: Record<IconName, string> = {
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  briefcase:
    '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  building:
    '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  calendar:
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  'check-circle': '<circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="m8.5 12 2.5 2.5 4.5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'hard-hat':
    '<path d="M2 20h20"/><path d="M7 20v-4a5 5 0 0 1 10 0v4"/><path d="M12 3v4"/><path d="M4.93 7.93A8 8 0 0 1 20 12H4a8 8 0 0 1 .93-4.07"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12"/>',
  'id-card':
    '<rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M15 11h2"/><path d="M15 14h2"/><path d="M6 5V3"/><path d="M18 5V3"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  'dollar-sign': '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':
    '<path d="M10.73 5.08a10.74 10.74 0 0 1 11.2 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/>',
  'file-text':
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'graduation-cap':
    '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  key: '<path d="m15.5 7.5 3 3L22 7l-3-3"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  'layout-dashboard':
    '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'log-in':
    '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'map-pin':
    '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  phone:
    '<path d="M13.83 16.57a1 1 0 0 0 1.21-.3l.36-.47A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.47.35a1 1 0 0 0-.29 1.23 14 14 0 0 0 6.39 6.39"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'search-x': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  'shield-check':
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m8.5 12.5 2.5 2.5 4.5-5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  'trending-up': '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>',
  user:
    '<circle cx="12" cy="8" r="4" stroke-width="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12v1" stroke-width="1.8"/><path d="M10 14h4" stroke-width="1.5" stroke-linecap="round"/>',
  'user-plus':
    '<circle cx="12" cy="8" r="4" stroke-width="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12v1" stroke-width="1.8"/><path d="M10 14h4" stroke-width="1.5" stroke-linecap="round"/><path d="M16 11h-5"/><path d="M13.5 8.5v5"/>',
  users:
    '<circle cx="9" cy="7" r="3.5" stroke-width="1.8"/><path d="M2 20c0-3.5 3.1-6 7-6" stroke-width="1.8" stroke-linecap="round"/><circle cx="16" cy="7" r="3" stroke-width="1.8"/><path d="M14 14c1-.4 2.1-.6 3-.6 3.3 0 6 2.2 6 5.6" stroke-width="1.8" stroke-linecap="round"/><path d="M9 14c3.5 0 7 2.2 7 6" stroke-width="1.8" stroke-linecap="round"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
};

/**
 * Renders one bundled SVG icon.
 *
 * Sizing is a numeric input (pixels) rather than a Tailwind class so the icon
 * keeps a valid intrinsic size in every layout, including print/screen-reader
 * contexts where CSS sizing may not apply.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      [innerHTML]="markup()"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class IconComponent {
  /** Which glyph to draw. */
  readonly name = input.required<IconName>();

  /** Edge length in pixels (lucide icons are drawn on a 24px grid). */
  readonly size = input(16);

  private readonly sanitizer = inject(DomSanitizer);

  /** Sanitized-by-us markup — the registry is a compile-time constant. */
  readonly markup = computed<SafeHtml>(
    () => this.sanitizer.bypassSecurityTrustHtml(ICON_MARKUP[this.name()] ?? ''),
  );
}
