import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ToastComponent } from './core/toast/toast.component';
import { FooterComponent } from './layout/footer/footer.component';
import { NavComponent } from './layout/nav/nav.component';

/**
 * Application shell.
 *
 * Owns only the chrome that exists on every route (atmosphere backdrop, nav,
 * footer on the home page, toast stack) plus the route-change page transition —
 * all page content itself lives behind the router outlet.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [RouterOutlet, NavComponent, FooterComponent, ToastComponent],
})
export class App {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Path of the current URL without its query string. */
  private readonly currentPath = signal('/');

  /** True only on the home page, which is the only page with the footer. */
  readonly isHome = computed(() => this.currentPath() === '/');

  /**
   * Toggled around every navigation so `.page-enter` is removed and re-added,
   * which is what actually restarts the CSS transition on route changes.
   */
  readonly animateMain = signal(true);

  constructor() {
    this.currentPath.set(this.router.url.split('?')[0]);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects.split('?')[0]);
        this.animateMain.set(false);
        // A macrotask guarantees a change-detection pass happens between the
        // "off" and "on" writes, so the class really is removed before it is
        // re-added and the animation restarts.
        setTimeout(() => this.animateMain.set(true), 0);
      });
  }
}
