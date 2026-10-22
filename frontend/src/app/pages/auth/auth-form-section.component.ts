import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Titled block used to group related fields inside the auth forms.
 *
 * Extracted so "Profile Details", "Company Details" and "Account Credentials"
 * share one header/divider treatment and the forms stay declarative.
 */
@Component({
  selector: 'app-auth-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4 rounded-2xl border border-[#D8D2C4] bg-white p-5 shadow-xs">
      <header>
        <h3 class="text-sm font-display font-bold tracking-wide text-[#1F2A24]">{{ title() }}</h3>
        <p class="mt-1 text-xs text-text-muted">{{ description() }}</p>
      </header>
      <ng-content />
    </section>
  `,
})
export class AuthFormSectionComponent {
  /** Section heading. */
  readonly title = input.required<string>();

  /** Small helper line under the heading. */
  readonly description = input.required<string>();
}
