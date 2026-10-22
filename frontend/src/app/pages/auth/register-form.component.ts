import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { getDashboardRoute } from '../../core/auth/dashboard-route';
import { RegisterRequest, Role } from '../../core/models/auth';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { AuthFieldComponent } from './auth-field.component';
import { AuthFormSectionComponent } from './auth-form-section.component';

/** E.164 phone number regex (use for client-side validation). */
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

/** Per-role palette/icon/label used in the form header. */
const ROLE_CONFIG: Record<Role, { bg: string; text: string; icon: IconName; label: string }> = {
  seeker: { bg: 'bg-[#D4622A]/10', text: 'text-[#D4622A]', icon: 'user', label: 'Seeker' },
  employer: { bg: 'bg-[#2E4A38]/10', text: 'text-[#2E4A38]', icon: 'briefcase', label: 'Employer' },
  admin: { bg: 'bg-[#1F2A24]/10', text: 'text-[#1F2A24]', icon: 'shield', label: 'Admin' },
};

/** Company size choices offered to employers. */
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

/**
 * Registration form with role-specific sections.
 */
@Component({
  selector: 'app-register-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, IconComponent, AuthFieldComponent, AuthFormSectionComponent],
  template: `
    <div class="w-full px-1 sm:px-2 page-enter">
      <div class="max-w-3xl mx-auto">
        <button
          type="button"
          (click)="back.emit()"
          class="flex items-center gap-2 text-sm text-text-muted hover:text-[#D4622A] mb-8 transition-colors group font-bold"
        >
          <app-icon class="group-hover:-translate-x-1 transition-transform" name="arrow-left" [size]="16" />
          Back to Role Selection
        </button>

        <div class="text-center mb-10">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            [ngClass]="config().bg + ' ' + config().text"
          >
            <app-icon [name]="config().icon" [size]="32" />
          </div>
          <h2 class="text-3xl font-display font-bold text-[#1F2A24] mb-3">
            Register as {{ config().label }}
          </h2>
          <p class="text-text-muted">Fill in your details to create an account</p>
        </div>

        <form (submit)="submit($event)" class="space-y-5">
          @switch (role()) {
            @case ('seeker') {
              <app-auth-form-section
                title="Profile Details"
                description="Tell employers about your background."
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-auth-field
                    label="Full Name"
                    icon="user"
                    placeholder="John Doe"
                    autocomplete="name"
                    [required]="true"
                    [value]="fullName()"
                    (valueChange)="fullName.set($event)"
                  />
                  <app-auth-field
                    label="Phone Number"
                    icon="phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    autocomplete="tel"
                    [required]="true"
                    [value]="phoneNumber()"
                    (valueChange)="phoneNumber.set($event)"
                  />
                  <app-auth-field
                    label="Education"
                    icon="graduation-cap"
                    placeholder="B.Tech, MBA, MSc..."
                    [required]="true"
                    [value]="education()"
                    (valueChange)="education.set($event)"
                  />
                  <app-auth-field
                    label="Experience (Years)"
                    icon="briefcase"
                    type="number"
                    [min]="0"
                    placeholder="0"
                    [required]="true"
                    [value]="experienceYears()"
                    (valueChange)="experienceYears.set($event)"
                  />
                </div>
              </app-auth-form-section>
            }
            @case ('employer') {
              <app-auth-form-section
                title="Company Details"
                description="Share your organization details for hiring visibility."
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-auth-field
                    label="Company Name"
                    icon="building"
                    placeholder="Acme Inc"
                    [required]="true"
                    [value]="companyName()"
                    (valueChange)="companyName.set($event)"
                  />
                  <app-auth-field
                    label="Industry"
                    icon="briefcase"
                    placeholder="Technology"
                    [required]="true"
                    [value]="industry()"
                    (valueChange)="industry.set($event)"
                  />
                  <div class="space-y-2">
                    <label
                      for="company-size"
                      class="text-xs font-bold uppercase tracking-widest text-text-muted"
                    >
                      Company Size
                    </label>
                    <div class="relative">
                      <select
                        #companySizeEl
                        id="company-size"
                        class="input-field w-full"
                        [value]="companySize()"
                        (change)="companySize.set(companySizeEl.value)"
                        required
                      >
                        <option value="" disabled>Select team size</option>
                        @for (size of companySizes; track size) {
                          <option [value]="size">{{ size }}</option>
                        }
                      </select>
                      <app-icon
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                        name="chevron-down"
                        [size]="16"
                      />
                    </div>
                  </div>
                  <app-auth-field
                    label="Company Location"
                    icon="map-pin"
                    placeholder="San Francisco"
                    [required]="true"
                    [value]="companyLocation()"
                    (valueChange)="companyLocation.set($event)"
                  />
                  <app-auth-field
                    label="Company Website"
                    icon="globe"
                    type="url"
                    placeholder="https://example.com"
                    [value]="companyWebsite()"
                    (valueChange)="companyWebsite.set($event)"
                  />
                  <app-auth-field
                    label="Company Phone (Optional)"
                    icon="phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    [value]="companyPhone()"
                    (valueChange)="companyPhone.set($event)"
                  />
                </div>
              </app-auth-form-section>
            }
            @case ('admin') {
              <app-auth-form-section
                title="Admin Verification"
                description="Enter the secret key to enable administrator access."
              >
                <app-auth-field
                  label="Admin Secret Key"
                  icon="key"
                  type="password"
                  placeholder="Enter security key"
                  autocomplete="off"
                  [required]="true"
                  [value]="secretKey()"
                  (valueChange)="secretKey.set($event)"
                />
              </app-auth-form-section>
            }
          }

          <app-auth-form-section
            title="Account Credentials"
            description="Use these details whenever you sign in."
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <app-auth-field
                  label="Email Address"
                  icon="mail"
                  type="email"
                  placeholder="name@example.com"
                  autocomplete="email"
                  [required]="true"
                  [value]="email()"
                  (valueChange)="email.set($event)"
                />
              </div>
              <app-auth-field
                label="Password"
                icon="lock"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                [required]="true"
                [value]="password()"
                (valueChange)="password.set($event)"
              />
              <app-auth-field
                label="Confirm Password"
                icon="lock"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                [required]="true"
                [value]="confirmPassword()"
                (valueChange)="confirmPassword.set($event)"
              />
            </div>
          </app-auth-form-section>

          <button
            type="submit"
            [disabled]="loading()"
            [class]="submitClass()"
          >
            {{ loading() ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <div class="mt-8 text-center">
          <button
            type="button"
            (click)="toggleMode.emit()"
            class="text-sm text-text-muted hover:text-brand-accent transition-colors font-bold"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RegisterFormComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Identity being registered — decides which sections render. */
  readonly role = input.required<Role>();

  /** Emits when the user returns to the role picker. */
  readonly back = output<void>();

  /** Emits when the user asks to switch to the login flow. */
  readonly toggleMode = output<void>();

  // --- shared credentials ---
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');

  // --- seeker fields ---
  readonly fullName = signal('');
  readonly education = signal('');
  readonly experienceYears = signal('');
  readonly phoneNumber = signal('');

  // --- employer fields ---
  readonly companyName = signal('');
  readonly industry = signal('');
  readonly companySize = signal('');
  readonly companyLocation = signal('');
  readonly companyWebsite = signal('');
  readonly companyPhone = signal('');

  // --- admin fields ---
  readonly secretKey = signal('');

  /** True while the registration request is in flight. */
  readonly loading = signal(false);

  /** Company size choices exposed to the template. */
  readonly companySizes = COMPANY_SIZES;

  /** Palette/icon/label for the current role. */
  readonly config = computed(() => ROLE_CONFIG[this.role()]);

  /** Submit button styling — yellow for employers, blue otherwise (as in React). */
  readonly submitClass = computed(
    () =>
      `w-full py-4 mt-4 font-bold rounded-xl transition-all shadow-lg disabled:opacity-60 ${
        this.role() === 'employer' ? 'btn-yellow' : 'btn-primary'
      }`,
  );

  /** Validates locally, then registers and routes to the new account's home. */
  submit(event: Event): void {
    event.preventDefault();
    if (this.loading()) {
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.toast.error('Passwords do not match');
      return;
    }
    if (this.role() === 'seeker' && !PHONE_REGEX.test(this.phoneNumber())) {
      this.toast.error('Enter a valid phone number (E.164, e.g. +919876543210).');
      return;
    }
    if (this.role() === 'employer' && this.companyPhone() && !PHONE_REGEX.test(this.companyPhone())) {
      this.toast.error('Enter a valid company phone (E.164, e.g. +919876543210).');
      return;
    }

    this.loading.set(true);
    this.auth
      .register(this.buildPayload())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.loading.set(false);
          void this.router.navigateByUrl(
            session.role ? getDashboardRoute(session.role) : '/',
            { replaceUrl: true },
          );
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(error instanceof Error ? error.message : 'Registration failed');
        },
      });
  }

  /** Assembles only the fields belonging to the selected role. */
  private buildPayload(): RegisterRequest {
    const role = this.role();
    const base: RegisterRequest = {
      role,
      email: this.email(),
      password: this.password(),
    };

    if (role === 'seeker') {
      return {
        ...base,
        full_name: this.fullName(),
        education: this.education(),
        experience_years: this.experienceYears() ? Number(this.experienceYears()) : undefined,
        phone_number: this.phoneNumber(),
      };
    }

    if (role === 'employer') {
      return {
        ...base,
        company_name: this.companyName(),
        industry: this.industry(),
        company_size: this.companySize(),
        company_location: this.companyLocation() || undefined,
        company_website: this.companyWebsite() || undefined,
        company_phone: this.companyPhone() || undefined,
      };
    }

    return { ...base, secretKey: this.secretKey() };
  }
}
