import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { HomeCompanyLogosStrip } from './company-logos-strip.component';

/** Company logos riding the three orbit rings (positions ported from React). */
interface OrbitLogo {
  src: string;
  /** Inline transform placing the tile on its orbit. */
  transform: string;
  alt: string;
}

/** Inner ring (25s clockwise): Google. */
const INNER_ORBIT: OrbitLogo[] = [
  { src: '/logos/google.png', alt: 'Google', transform: 'rotate(0deg) translateX(140px) rotate(0deg)' },
];

/** Middle ring (35s counter-clockwise): Meta & Amazon. */
const MIDDLE_ORBIT: OrbitLogo[] = [
  { src: '/logos/meta.png', alt: 'Meta', transform: 'rotate(90deg) translateX(220px) rotate(-90deg)' },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    alt: 'Amazon',
    transform: 'rotate(270deg) translateX(220px) rotate(-270deg)',
  },
];

/** Outer ring (50s clockwise): Apple & Netflix. */
const OUTER_ORBIT: OrbitLogo[] = [
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    alt: 'Apple',
    transform: 'rotate(45deg) translateX(300px) rotate(-45deg)',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    alt: 'Netflix',
    transform: 'rotate(225deg) translateX(300px) rotate(-225deg)',
  },
];

/**
 * Home hero: headline, CTA and the animated orbit artwork.
 */
@Component({
  selector: 'app-home-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink, IconComponent, LogoComponent, HomeCompanyLogosStrip],
  template: `
    <section
      id="home-hero"
      class="relative pt-36 pb-24 px-6 overflow-hidden"
      (mousemove)="onMouseMove($event)"
    >
      <div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div class="page-enter">
          <div [style.transform]="parallaxTransform()" class="transition-transform duration-700 ease-out">
            <div
              class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E7EFE9] text-[#1E3A28] text-xs font-extrabold uppercase tracking-widest mb-8 border border-[#2E4A38]/40 shadow-sm"
            >
              <app-icon name="zap" [size]="14" /> The Future of Hiring
            </div>
            <h1 class="hero-text mb-8 text-[#1F2A24]">
              Unlock Top <br />
              <span class="text-[#6B6459]">Marketing Talent</span> <br />
              You Thought Was <br />
              Out of Reach — <br />
              <span class="text-[#D4622A]">
                Now Just One <br /> Click Away!
              </span>
            </h1>

            <div class="flex flex-wrap gap-4 mb-12">
              <a routerLink="/register" class="btn-primary py-4 px-10 flex items-center gap-2 group text-base shadow-lg">
                Get Started
                <app-icon class="group-hover:translate-x-1 transition-transform" name="arrow-right" [size]="20" />
              </a>
              <a routerLink="/explore-jobs" class="px-8 py-4 rounded-xl border-2 border-[#1F2A24] bg-white text-[#1F2A24] font-bold hover:border-[#D4622A] hover:text-[#D4622A] transition-all text-base shadow-sm">
                Explore Jobs
              </a>
            </div>
          </div>
        </div>

        <div class="relative flex items-center justify-center min-h-[640px]">
          <div class="orbit-container">
            <!-- Center Anchor Orb -->
            <div
              class="animate-orbit z-20 w-32 h-32 rounded-full border-4 border-[#D4622A] bg-white flex items-center justify-center shadow-[0_12px_40px_rgba(212,98,42,0.35)]"
              [ngStyle]="{ '--duration': '20s' }"
            >
              <app-logo [hideText]="true" class="scale-150" />
            </div>

            <!-- Concentric High-Contrast Orbit Rings (280px, 440px, 600px) -->
            <div class="orbit-ring w-[280px] h-[280px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <div class="orbit-ring w-[440px] h-[440px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            <div class="orbit-ring w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

            <!-- Inner Orbit (25s) -->
            <div class="animate-orbit absolute inset-0 z-10" [ngStyle]="{ '--duration': '25s' }">
              @for (logo of innerOrbit; track logo.alt) {
                <div class="absolute top-1/2 left-1/2" [style.transform]="logo.transform">
                  <div class="-translate-x-1/2 -translate-y-1/2 p-3 bg-white border-2 border-[#1F2A24] rounded-2xl shadow-[0_10px_25px_rgba(31,42,36,0.18)] hover:border-[#D4622A] hover:scale-125 transition-all cursor-pointer">
                    <img [src]="logo.src" class="w-8 h-8 object-contain" [alt]="logo.alt" />
                  </div>
                </div>
              }
            </div>

            <!-- Middle Orbit (35s reverse) -->
            <div class="animate-orbit-reverse absolute inset-0 z-10" [ngStyle]="{ '--duration': '35s' }">
              @for (logo of middleOrbit; track logo.alt) {
                <div class="absolute top-1/2 left-1/2" [style.transform]="logo.transform">
                  <div class="-translate-x-1/2 -translate-y-1/2 p-3 bg-white border-2 border-[#1F2A24] rounded-2xl shadow-[0_10px_25px_rgba(31,42,36,0.18)] hover:border-[#D4622A] hover:scale-125 transition-all cursor-pointer">
                    <img [src]="logo.src" class="w-8 h-8 object-contain" [alt]="logo.alt" />
                  </div>
                </div>
              }
            </div>

            <!-- Outer Orbit (50s) -->
            <div class="animate-orbit absolute inset-0 z-10" [ngStyle]="{ '--duration': '50s' }">
              @for (logo of outerOrbit; track logo.alt) {
                <div class="absolute top-1/2 left-1/2" [style.transform]="logo.transform">
                  <div class="-translate-x-1/2 -translate-y-1/2 p-3 bg-white border-2 border-[#1F2A24] rounded-2xl shadow-[0_10px_25px_rgba(31,42,36,0.18)] hover:border-[#D4622A] hover:scale-125 transition-all cursor-pointer">
                    <img [src]="logo.src" class="w-8 h-8 object-contain" [alt]="logo.alt" />
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <app-company-logos-strip />
    </section>
  `,
})
export class HomeHeroComponent {
  /** CSS transform applied to the copy column for the pointer parallax. */
  readonly parallaxTransform = signal('translate(0px, 0px)');

  /** Inner ring logos. */
  readonly innerOrbit = INNER_ORBIT;

  /** Middle ring logos. */
  readonly middleOrbit = MIDDLE_ORBIT;

  /** Outer ring logos. */
  readonly outerOrbit = OUTER_ORBIT;

  /** Maps the pointer position across the viewport into a subtle drift. */
  onMouseMove(event: MouseEvent): void {
    const x = (event.clientX / window.innerWidth - 0.5) * 40;
    const y = (event.clientY / window.innerHeight - 0.5) * 40;
    this.parallaxTransform.set(`translate(${x}px, ${y}px)`);
  }
}
