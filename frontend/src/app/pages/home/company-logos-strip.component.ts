import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Customer logos shown under the hero.
 *
 * Served from `public/logos/` rather than a CDN: the jsDelivr devicon path
 * these originally pointed at now answers 403 ("package size exceeded 50 MB"),
 * which left the Microsoft tile rendering its `alt` text instead of an image.
 */
const COMPANY_LOGOS: ReadonlyArray<{ src: string; alt: string }> = [
  { src: '/logos/google.svg', alt: 'Google' },
  { src: '/logos/microsoft.svg', alt: 'Microsoft' },
  { src: '/logos/amazon.svg', alt: 'Amazon' },
  { src: '/logos/apple.svg', alt: 'Apple' },
  { src: '/logos/meta.svg', alt: 'Meta' },
];

/**
 * High-contrast logo strip with smooth hover interactions.
 */
@Component({
  selector: 'app-company-logos-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-7xl mx-auto px-6 mt-20">
      <p class="text-center text-xs font-bold uppercase tracking-widest text-[#6B6459] mb-6">Trusted by Hiring Teams at World-Class Companies</p>
      <div
        class="flex flex-wrap justify-center items-center gap-12 py-6 px-8 rounded-2xl bg-white border border-[#D8D2C4] shadow-sm"
      >
        @for (logo of logos; track logo.alt) {
          <img [src]="logo.src" class="h-8 object-contain filter grayscale hover:grayscale-0 opacity-75 hover:opacity-100 transition-all duration-300 cursor-pointer" [alt]="logo.alt" />
        }
      </div>
    </div>
  `,
})
export class HomeCompanyLogosStrip {
  /** Logos rendered in the strip. */
  readonly logos = COMPANY_LOGOS;
}
