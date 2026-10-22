import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService } from './toast.service';

/**
 * Fixed top-right toast column.
 *
 * Markup and classes mirror the React `Toast` component so notifications look
 * and move identically; state lives entirely in {@link ToastService}.
 */
@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  template: `
    <div
      class="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast-in pointer-events-auto flex items-start gap-3 min-w-72 max-w-sm px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-2xl"
          [ngClass]="
            toast.type === 'error'
              ? 'bg-red-950/80 border-red-500/25 text-red-300'
              : 'bg-green-950/80 border-green-500/25 text-green-300'
          "
        >
          @if (toast.type === 'error') {
            <svg
              class="w-5 h-5 shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          } @else {
            <svg
              class="w-5 h-5 shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          }
          <span class="text-sm font-medium leading-snug flex-1">{{ toast.message }}</span>
          <button
            type="button"
            class="ml-1 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
            (click)="toastService.dismiss(toast.id)"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ToastComponent {
  /** Injected so the template stays purely presentational. */
  readonly toastService = inject(ToastService);
}
