import { Injectable, signal } from '@angular/core';

/** How long a toast stays on screen before auto-dismissing (matches React app). */
const TOAST_DURATION_MS = 4500;

/** Visual flavour of a toast — drives the icon and the colour classes. */
export type ToastType = 'error' | 'success';

/** One toast currently shown in the stack. */
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/**
 * Signal-based toast queue shared by the whole app.
 *
 * Components call `success()`/`error()` from any HTTP error handler; the
 * `ToastComponent` just renders `toasts()`, so notification UI never has to be
 * wired through props or events.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsState = signal<ToastItem[]>([]);
  private lastId = 0;

  /** Ordered stack of visible toasts (newest last). */
  readonly toasts = this.toastsState.asReadonly();

  /** Queues a positive confirmation. */
  success(message: string): void {
    this.add(message, 'success');
  }

  /** Queues an error/failure message. */
  error(message: string): void {
    this.add(message, 'error');
  }

  /** Removes a toast early (used by the dismiss button). */
  dismiss(id: number): void {
    this.toastsState.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private add(message: string, type: ToastType): void {
    const id = ++this.lastId;
    this.toastsState.update((toasts) => [...toasts, { id, message, type }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}
