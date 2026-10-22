import { Signal, WritableSignal } from '@angular/core';

/**
 * Updates a single field of a signal-backed form object.
 *
 * ```ts
 * form.update(updateFormField('email', 'new@value.com'));
 * ```
 */
export function updateFormField<T extends Record<string, unknown>>(
  key: keyof T,
  value: T[keyof T],
): (form: T) => T {
  return (form) => ({ ...form, [key]: value });
}

/**
 * Updates multiple fields of a signal-backed form object at once.
 *
 * ```ts
 * form.update(updateFormFields({ email: 'new@value.com', name: 'New Name' }));
 * ```
 */
export function updateFormFields<T extends Record<string, unknown>>(
  patches: Partial<T>,
): (form: T) => T {
  return (form) => ({ ...form, ...patches });
}

/**
 * Creates a setter for a specific form field that can be used directly as
 * an event handler.
 *
 * ```ts
 * // In template: (input)="setField('email')($event)"
 * // In class:
 * setField = createFieldSetter(form, 'email');
 * ```
 */
export function createFieldSetter<T extends Record<string, unknown>>(
  form: WritableSignal<T>,
  key: keyof T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (event: Event) => T[keyof T] = (e) => (e.target as HTMLInputElement).value as any,
): (event: Event) => void {
  return (event: Event) => form.update(updateFormField(key, transform(event)));
}