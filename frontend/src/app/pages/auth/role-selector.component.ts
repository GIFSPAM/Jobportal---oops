import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Role } from '../../core/models/auth';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

/** One selectable identity on the role picker. */
interface RoleOption {
  id: Role;
  title: string;
  icon: IconName;
  color: string;
  description: string;
}

/** The three registrable identities, styled as in the React `RoleSelector`. */
const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'seeker',
    title: 'Job Seeker',
    icon: 'id-card',
    color: 'bg-[#D4622A]/10 text-[#D4622A]',
    description: 'Find your next career move',
  },
  {
    id: 'employer',
    title: 'Employer',
    icon: 'briefcase',
    color: 'bg-[#2E4A38]/10 text-[#2E4A38]',
    description: 'Hire the best talent',
  },
  {
    id: 'admin',
    title: 'Administrator',
    icon: 'shield',
    color: 'bg-[#1F2A24]/10 text-[#1F2A24]',
    description: 'Manage the platform',
  },
];

/**
 * Step 1 of registration: pick who you are before seeing any form fields.
 */
@Component({
  selector: 'app-role-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgClass],
  template: `
    <div class="w-full px-1 sm:px-2 page-enter">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-10">
          <h2 class="text-3xl font-display font-bold text-[#1F2A24] mb-3">
            {{ isLogin() ? 'Welcome Back' : 'Create Account' }}
          </h2>
          <p class="text-text-muted">Please select your role to continue</p>
        </div>

        <div class="grid gap-4">
          @for (option of roleOptions; track option.id) {
            <button
              type="button"
              (click)="select.emit(option.id)"
              class="flex items-center justify-between p-6 rounded-2xl border border-[#D8D2C4] bg-white shadow-sm hover:border-brand-accent hover:shadow-md transition-all group"
            >
              <span class="flex items-center gap-4">
                <span
                  class="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
                  [ngClass]="option.color"
                >
                  <app-icon [name]="option.icon" [size]="24" />
                </span>
                <span class="text-left">
                  <span class="block font-bold text-[#1F2A24] text-lg">{{ option.title }}</span>
                  <span class="block text-sm text-text-muted">{{ option.description }}</span>
                </span>
              </span>
              <app-icon
                class="text-text-muted group-hover:text-brand-accent transition-colors"
                name="chevron-right"
                [size]="20"
              />
            </button>
          }
        </div>

        <div class="mt-8 text-center">
          <button
            type="button"
            (click)="toggleMode.emit()"
            class="text-sm text-text-muted hover:text-brand-accent transition-colors font-bold"
          >
            {{ isLogin() ? "Don't have an account? Register" : 'Already have an account? Login' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RoleSelectorComponent {
  /** Whether the surrounding flow is sign-in (changes copy only). */
  readonly isLogin = input(false);

  /** Emits the identity the user picked. */
  readonly select = output<Role>();

  /** Emits when the user asks to switch between login and register. */
  readonly toggleMode = output<void>();

  /** Role cards rendered in order. */
  readonly roleOptions = ROLE_OPTIONS;
}
