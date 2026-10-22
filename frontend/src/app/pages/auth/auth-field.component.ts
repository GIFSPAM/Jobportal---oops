import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

/** Module-level counter guaranteeing a unique `id` for every `label for` pair. */
let nextFieldId = 0;

/**
 * Labelled text input with an optional leading icon and password reveal toggle.
 *
 * The label is wired to the input via a real `id`/`for` pair (screen readers
 * announce it) and state lives in signals, so forms bind with plain
 * `[value]`/`(valueChange)` instead of `FormsModule`.
 */
@Component({
  selector: 'app-auth-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="space-y-2">
      <label
        [attr.for]="fieldId"
        class="text-xs font-bold uppercase tracking-widest text-text-muted"
      >
        {{ label() }}
      </label>
      <div class="relative">
        @if (icon(); as iconName) {
          <app-icon
            class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            [name]="iconName"
            [size]="16"
          />
        }
        <input
          #inputEl
          [id]="fieldId"
          [type]="resolvedType()"
          [placeholder]="placeholder()"
          class="input-field input-field-with-icon"
          [class.pr-12]="isPassword()"
          [value]="value()"
          (input)="value.set(inputEl.value)"
          [required]="required()"
          [attr.min]="min() ?? null"
          [attr.autocomplete]="autocomplete() ?? null"
        />
        @if (isPassword()) {
          <button
            type="button"
            (click)="showPass.set(!showPass())"
            [attr.aria-label]="showPass() ? 'Hide password' : 'Show password'"
            [attr.aria-pressed]="showPass()"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-accent transition-colors"
          >
            <app-icon [name]="showPass() ? 'eye-off' : 'eye'" [size]="16" />
          </button>
        }
      </div>
    </div>
  `,
})
export class AuthFieldComponent {
  /** Field caption, also used as the accessible name of the input. */
  readonly label = input.required<string>();

  /** Optional leading glyph. */
  readonly icon = input<IconName>();

  /** HTML input type; `password` also enables the reveal toggle. */
  readonly type = input<'text' | 'email' | 'password' | 'tel' | 'number' | 'url'>('text');

  /** Placeholder text (kept short — the label carries the real meaning). */
  readonly placeholder = input('');

  /** Whether the browser should block empty submits. */
  readonly required = input(false);

  /** Numeric floor for `type="number"` fields. */
  readonly min = input<number>();

  /** `autocomplete` hint so browsers/password managers fill correctly. */
  readonly autocomplete = input<string>();

  /** Two-way-bound field value; parents watch `(valueChange)` to store state. */
  readonly value = model('');

  /** Reveal state of a password field. */
  readonly showPass = signal(false);

  /** True when this field is a password input. */
  readonly isPassword = computed(() => this.type() === 'password');

  /** Effective input type — flips to `text` while revealed. */
  readonly resolvedType = computed(() =>
    this.isPassword() && this.showPass() ? 'text' : this.type(),
  );

  /** Unique id shared by the `<label for>` and the `<input>`. */
  readonly fieldId = `auth-field-${++nextFieldId}`;
}
