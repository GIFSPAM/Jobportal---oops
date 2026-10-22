import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/**
 * The JOBYTES mark (orb + blue "tie" glyph) with its wordmark.
 *
 * Also the global "go home" affordance: clicking it on the home page scrolls
 * back to the top instead of triggering a redundant navigation.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink],
  template: `
    <a
      routerLink="/"
      class="flex items-center gap-3 group cursor-pointer"
      [ngClass]="className()"
      (click)="handleClick()"
    >
      <span class="relative w-10 h-10 flex items-center justify-center shrink-0">
        <span
          class="absolute inset-0 bg-brand-accent/15 rounded-full border border-brand-accent/40 group-hover:scale-110 transition-all duration-500 shadow-[0_0_15px_rgba(212,98,42,0.25)]"
        ></span>
        <svg viewBox="0 0 24 24" class="w-6 h-6 relative z-10 overflow-visible" aria-hidden="true">
          <path
            d="M12 4l3 5-3 11-3-11z"
            fill="#D4622A"
            class="drop-shadow-[0_0_10px_rgba(212,98,42,0.6)]"
          />
          <path d="M12 4l1.5 2.5-1.5 1.5-1.5-1.5z" fill="#B85220" />
        </svg>
      </span>
      @if (!hideText()) {
        <span class="flex flex-col leading-none">
          <span class="font-display text-xl font-black text-[#1F2A24] tracking-tighter uppercase">jobytes</span>
          <span class="text-[10px] font-bold text-brand-accent tracking-[0.2em] uppercase opacity-90">
            Future Work
          </span>
        </span>
      }
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class LogoComponent {
  /** Extra classes merged onto the anchor (spacing tweaks from callers). */
  readonly className = input('');

  /** Hides the wordmark, keeping only the glyph (used inside orbit art). */
  readonly hideText = input(false);

  private readonly router = inject(Router);

  /** Smooth-scrolls to the top when already home; otherwise navigates normally. */
  handleClick(): void {
    if (this.router.url === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
