import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LogoComponent } from '../../shared/components/logo/logo.component';

/** Footer links: static informational anchors (kept declarative for easy edits). */
const NAV_LINKS: ReadonlyArray<{ label: string }> = [
  { label: 'About' },
  { label: 'Careers' },
  { label: 'Support' },
  { label: 'Contact' },
];

const LEGAL_LINKS: ReadonlyArray<{ label: string }> = [
  { label: 'Privacy' },
  { label: 'Terms' },
  { label: 'Cookies' },
];

/**
 * Site footer, shown on the home page only (mirrors the React `HomeFooter`).
 *
 * Content lives in constants so the markup stays readable and link lists can be
 * changed without touching the template structure.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent],
  template: `
    <footer class="py-16 px-6 border-t border-[#D8D2C4] bg-brand-bg">
      <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-center gap-10 mb-12">
          <app-logo />
          <nav class="flex gap-10 text-sm font-bold text-text-muted" aria-label="Footer">
            @for (link of navLinks; track link.label) {
              <a href="#" class="hover:text-[#D4622A] transition-colors">{{ link.label }}</a>
            }
          </nav>
        </div>
        <div
          class="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-[#D8D2C4] text-xs text-text-muted"
        >
          <p>© 2026 jobytes Inc. Built for the future of work.</p>
          <nav class="flex gap-6" aria-label="Legal">
            @for (link of legalLinks; track link.label) {
              <a href="#" class="hover:text-[#D4622A] transition-colors">{{ link.label }}</a>
            }
          </nav>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  /** Company/about links rendered in the footer's top row. */
  readonly navLinks = NAV_LINKS;

  /** Legal links rendered in the footer's bottom row. */
  readonly legalLinks = LEGAL_LINKS;
}
