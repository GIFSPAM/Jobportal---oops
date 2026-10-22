import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { getDashboardRoute } from '../../core/auth/dashboard-route';
import { LogoComponent } from '../../shared/components/logo/logo.component';

/** One link in the floating navbar; `tab` marks the admin query-tab it belongs to. */
interface NavLink {
  to: string;
  label: string;
  queryParams?: Record<string, string>;
  tab?: string;
}

const BASE_LINK_CLASS = 'text-[#6B6459] hover:text-[#D4622A] font-bold transition-colors';
const ACTIVE_LINK_CLASS = 'text-[#D4622A] font-extrabold border-b-2 border-[#D4622A] pb-0.5';

/** Guest menu — mirrors the React `getGuestLinks`. */
const GUEST_LINKS: NavLink[] = [
  { to: '/', label: 'Home' },
  { to: '/explore-jobs', label: 'Explore Jobs' },
  { to: '/register', label: 'Post a Job' },
];

/** Admin menu — points at dedicated pages (formerly `?tab=` tabs). */
const ADMIN_LINKS: NavLink[] = [
  { to: '/admin/dashboard', label: 'Overview', tab: 'overview' },
  { to: '/admin/users', label: 'Users', tab: 'users' },
  { to: '/admin/jobs/moderation', label: 'Jobs', tab: 'jobs' },
  { to: '/admin/employers', label: 'Employers', tab: 'employers' },
  { to: '/admin/seekers', label: 'Seekers', tab: 'seekers' },
  { to: '/admin/dashboard', label: 'Logs', queryParams: { tab: 'logs' }, tab: 'logs' },
];

/**
 * Floating pill navbar.
 */
@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent],
  host: {
    '(window:scroll)': 'onEdgeCheck()',
    '(window:resize)': 'onEdgeCheck()',
    '(window:mousemove)': 'onMouseMove($event)',
    '(window:focusin)': 'reveal()',
  },
  template: `
    <div class="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full px-6 max-w-6xl pointer-events-none h-28">
      <nav
        class="pointer-events-auto px-6 py-4 flex items-center justify-between rounded-3xl border border-[#D8D2C4] bg-white/95 backdrop-blur-xl shadow-xl transition-[transform,opacity] duration-300 ease-out"
        [style.transform]="navTransform()"
        [style.opacity]="navOpacity()"
        (mouseenter)="onNavEnter()"
        (mouseleave)="onNavLeave()"
        aria-label="Main"
      >
        <app-logo />

        <div class="hidden md:flex items-center gap-10 text-sm font-bold text-[#6B6459]">
          @for (link of navLinks(); track link.label) {
            <a
              [routerLink]="link.to"
              [queryParams]="link.queryParams ?? null"
              [class]="linkClass(link)"
            >
              {{ link.label }}
            </a>
          }
        </div>

        <div class="flex items-center gap-6">
          @if (user()) {
            <button
              type="button"
              (click)="logout()"
              class="text-sm font-bold text-[#6B6459] hover:text-[#D4622A] transition-colors"
            >
              Log Out
            </button>
          } @else {
            <a
              routerLink="/login"
              class="text-sm font-bold text-[#6B6459] hover:text-[#D4622A] transition-colors"
            >
              Log In
            </a>
            <a routerLink="/register" class="btn-primary py-2.5 px-6 text-sm rounded-full!">
              Join Now
            </a>
          }
        </div>
      </nav>
    </div>
  `,
})
export class NavComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Current URL (query included) — drives active links and visibility rules. */
  private readonly currentUrl = signal('');

  /** True while the pointer rests on the nav, pinning it open. */
  private readonly navHovered = signal(false);

  /** Whether the nav is currently extended; retracts to the top when false. */
  private readonly showNav = signal(true);

  /** Decoded session, read straight from the auth signal. */
  readonly user = this.auth.user;

  /** Path of the current URL without its query string. */
  readonly currentPath = computed(() => this.currentUrl().split('?')[0]);

  /** Active admin tab (`overview` when no `?tab=` is present). */
  readonly adminTab = computed(
    () => new URLSearchParams(this.currentUrl().split('?')[1] ?? '').get('tab') ?? 'overview',
  );

  /** Menu for the current session; admins get tabs, guests get the public menu. */
  readonly navLinks = computed<NavLink[]>(() => {
    const user = this.user();
    if (!user) {
      return GUEST_LINKS;
    }
    if (user.role === 'admin') {
      return ADMIN_LINKS;
    }
    return user.role === 'jobseeker'
      ? this.seekerLinks()
      : [
          { to: getDashboardRoute('employer'), label: 'My Dashboard' },
          { to: '/employer/applications', label: 'Applications' },
          { to: '/employer/my-jobs', label: 'My Jobs' },
          { to: '/employer/profile', label: 'My Profile' },
        ];
  });

  /** CSS transform producing the slide-in/slide-out motion. */
  readonly navTransform = computed(() =>
    (this.showNav() || this.navHovered()) ? 'translateY(24px)' : 'translateY(-38px)',
  );

  /** Slightly dimmed while retracted, matching the React opacity of 0.7. */
  readonly navOpacity = computed(() => ((this.showNav() || this.navHovered()) ? 1 : 0.7));

  constructor() {
    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.evaluateVisibility();
      });

    this.evaluateVisibility();
  }

  /** Seeker menu — mirrors the React `getUserLinks('jobseeker', …)`. */
  private seekerLinks(): NavLink[] {
    return [
      { to: getDashboardRoute('jobseeker'), label: 'My Dashboard' },
      { to: '/explore-jobs', label: 'Explore Jobs' },
      { to: '/seeker/applications', label: 'Applications' },
      { to: '/seeker/saved-jobs', label: 'Saved Jobs' },
      { to: '/seeker/profile', label: 'My Profile' },
    ];
  }

  /** Highlight rules: admins compare tabs, everyone else compares paths. */
  linkClass(link: NavLink): string {
    const isActive =
      this.user()?.role === 'admin'
        ? this.adminTab() === link.tab
        : this.currentPath() === link.to;
    return isActive ? `${BASE_LINK_CLASS} ${ACTIVE_LINK_CLASS}` : BASE_LINK_CLASS;
  }

  /** Clears the session and returns to the public sign-in page. */
  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }

  /** Opens the nav while the pointer is on it. */
  onNavEnter(): void {
    this.navHovered.set(true);
    this.showNav.set(true);
  }

  /** Retracts the nav when the pointer leaves (unless touch/coarse pointer). */
  onNavLeave(): void {
    this.navHovered.set(false);
    if (!this.isCoarsePointer()) {
      this.evaluateVisibility();
    }
  }

  /** On non-home pages the nav appears only near the top edge of the viewport. */
  onMouseMove(event: MouseEvent): void {
    if (this.isHome() || this.isCoarsePointer() || this.navHovered()) {
      return;
    }
    this.showNav.set(event.clientY <= 96);
  }

  /** Scroll/resize re-evaluation: hero-based on home, a no-op elsewhere. */
  onEdgeCheck(): void {
    if (!this.isHome()) {
      return;
    }
    this.evaluateVisibility();
  }

  /** Focus entering the page must always reveal the nav (keyboard users). */
  reveal(): void {
    this.showNav.set(true);
  }

  /** Home: visible until the hero scrolls out; other pages: top edge only. */
  private evaluateVisibility(): void {
    if (this.navHovered()) {
      this.showNav.set(true);
      return;
    }
    if (this.isCoarsePointer()) {
      this.showNav.set(true);
      return;
    }
    if (this.isHome()) {
      const hero = document.getElementById('home-hero');
      const heroBottom = hero
        ? hero.getBoundingClientRect().top + window.scrollY + hero.offsetHeight
        : window.innerHeight;
      this.showNav.set(window.scrollY <= heroBottom - 120);
      return;
    }
    // Non-home pages start visible; the mousemove listener retracts them as
    // soon as the pointer moves away from the top edge.
    this.showNav.set(true);
  }

  private isHome(): boolean {
    return this.currentPath() === '/';
  }

  private isCoarsePointer(): boolean {
    // Guarded: jsdom-based test environments don't implement matchMedia.
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches
    );
  }
}
