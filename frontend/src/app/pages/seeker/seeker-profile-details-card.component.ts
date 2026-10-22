import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import { SeekerProfile } from '../../core/models/seeker';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent } from '../../shared';
import { SeekerResumeCard } from './seeker-resume-card.component';
import { SeekerSkillsEditor } from './seeker-skills-editor.component';

/** Profile fields editable through the inline editor. */
type ProfileFormKey = 'full_name' | 'education' | 'phone_number' | 'experience_years';

/** Editable profile field values, all kept as strings for the inputs. */
interface ProfileForm {
  full_name: string;
  education: string;
  phone_number: string;
  experience_years: string;
}

/**
 * The "Profile Details" card: identity photo, the four editable field tiles,
 * the save action, plus the nested resume and skills editors.
 *
 * It owns only the edit-mode state for its own fields; the loaded profile
 * arrives as an input and every mutation is emitted back up so the page can
 * fold it into the shared `overview()` payload (which also drives the header
 * avatar and the stat tiles). This keeps one request behind the whole screen.
 */
@Component({
  selector: 'app-seeker-profile-details-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SeekerResumeCard, SeekerSkillsEditor],
  template: `
    <div class="glass-card p-8">
      <div class="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] flex items-center gap-2">
          <app-icon name="user" [size]="20" class="text-brand-accent" />
          Profile Details
        </h2>
        @if (!loading()) {
          <button
            type="button"
            (click)="toggleProfileEditor()"
            [disabled]="isSavingProfile()"
            class="inline-flex items-center justify-center min-w-40 px-4 py-2.5 rounded-xl border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-sm font-bold hover:bg-brand-accent/15 transition-all disabled:opacity-60"
          >
            {{ isProfileEditMode() ? 'Close Editor' : 'Update Profile' }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (row of detailSkeletons; track row) {
            <div class="h-12 bg-[#F1EDE4] rounded-xl animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4 sm:col-span-2">
            <p
              class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2"
            >
              <app-icon name="id-card" [size]="16" />
              PROFILE
            </p>
            <div class="flex items-center gap-3 flex-wrap">
              <div
                class="w-20 h-20 rounded-full border border-[#D8D2C4] bg-brand-accent/15 text-brand-accent font-bold flex items-center justify-center overflow-hidden"
              >
                <img
                  [src]="avatarSrc()"
                  [alt]="avatarAlt()"
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                  (error)="avatarFailedChange.emit(true)"
                />
              </div>
              @if (isProfileEditMode()) {
                <div class="flex items-center gap-2 flex-wrap">
                  <input
                    #photoInput
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    aria-label="Choose a profile photo"
                    (change)="onPhotoSelected($event)"
                    class="hidden"
                  />
                  <button
                    type="button"
                    (click)="photoInput.click()"
                    [disabled]="profileImageUploading()"
                    class="inline-flex items-center justify-center min-w-40 px-4 py-2.5 rounded-xl border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-sm font-bold hover:bg-brand-accent/15 transition-all disabled:opacity-50"
                  >
                    <app-icon name="plus" [size]="16" />
                    {{
                      profileImageUploading() ? 'Uploading...' : 'Upload Profile Photo'
                    }}
                  </button>
                </div>
              }
            </div>
          </div>

          <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
            @if (isProfileEditMode()) {
              <label
                for="seeker-full-name"
                class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 block"
              >
                Full Name
              </label>
              <input
                id="seeker-full-name"
                type="text"
                class="input-field h-11"
                placeholder="Your full name"
                [value]="profileForm().full_name"
                (input)="onFormChange('full_name', $event)"
              />
            } @else {
              <p class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
                Full Name
              </p>
              <p class="text-[#1F2A24] font-medium">{{ profile()?.full_name ?? 'Not added' }}</p>
            }
          </div>

          <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
            @if (isProfileEditMode()) {
              <label
                for="seeker-education"
                class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2"
              >
                <app-icon name="graduation-cap" [size]="16" />
                Education
              </label>
              <input
                id="seeker-education"
                type="text"
                class="input-field h-11"
                placeholder="Your education"
                [value]="profileForm().education"
                (input)="onFormChange('education', $event)"
              />
            } @else {
              <p
                class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2"
              >
                <app-icon name="graduation-cap" [size]="16" />
                Education
              </p>
              <p class="text-[#1F2A24] font-medium">
                {{ profile()?.education ?? 'Not added' }}
              </p>
            }
          </div>

          <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
            @if (isProfileEditMode()) {
              <label
                for="seeker-phone"
                class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2"
              >
                <app-icon name="phone" [size]="16" />
                Phone
              </label>
              <input
                id="seeker-phone"
                type="tel"
                class="input-field h-11"
                placeholder="Your phone number"
                [value]="profileForm().phone_number"
                (input)="onFormChange('phone_number', $event)"
              />
            } @else {
              <p
                class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2"
              >
                <app-icon name="phone" [size]="16" />
                Phone
              </p>
              <p class="text-[#1F2A24] font-medium">
                {{ profile()?.phone_number ?? 'Not added' }}
              </p>
            }
          </div>

          <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
            @if (isProfileEditMode()) {
              <label
                for="seeker-experience"
                class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2 block"
              >
                Experience
              </label>
              <input
                id="seeker-experience"
                type="number"
                min="0"
                class="input-field h-11"
                [value]="profileForm().experience_years"
                (input)="onFormChange('experience_years', $event)"
              />
            } @else {
              <p class="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">
                Experience
              </p>
              <p class="text-[#1F2A24] font-medium">
                {{ profile()?.experience_years ?? 0 }} years
              </p>
            }
          </div>
        </div>

        @if (isProfileEditMode()) {
          <div class="flex justify-end mb-6">
            <button
              type="button"
              (click)="saveProfile()"
              [disabled]="isSavingProfile()"
              class="inline-flex items-center justify-center min-w-40 px-4 py-2.5 rounded-xl border border-green-500/20 bg-green-500/10 text-green-700 text-sm font-bold hover:bg-green-500/15 transition-all disabled:opacity-60"
            >
              {{ isSavingProfile() ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        }

        <app-seeker-resume-card
          [resumeFilename]="profile()?.resume_filename ?? null"
          (profileChanged)="profileChanged.emit($event)"
        />

        <app-seeker-skills-editor
          [skills]="profile()?.skills ?? []"
          (profileChanged)="profileChanged.emit($event)"
        />
      }
    </div>
  `,
})
export class SeekerProfileDetailsCard {
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Loaded profile, or `null` before the page's overview request resolves. */
  readonly profile = input<SeekerProfile | null>(null);

  /** True until the page's overview request settles. */
  readonly loading = input(true);

  /** Resolved avatar image source for this card. */
  readonly avatarSrc = input.required<string>();

  /** Alt text for the avatar rendering. */
  readonly avatarAlt = input.required<string>();

  /** Emits the refetched profile after a successful save or photo upload. */
  readonly profileChanged = output<SeekerProfile>();

  /**
   * Emits this card's avatar failure state — `true` on an image error, `false`
   * after a fresh photo upload. The page owns the flag because the header
   * avatar reads it too, so one broken image switches both renderings.
   */
  readonly avatarFailedChange = output<boolean>();

  /** Inline editor state. */
  readonly isProfileEditMode = signal(false);
  readonly isSavingProfile = signal(false);
  readonly profileImageUploading = signal(false);
  readonly profileForm = signal<ProfileForm>({
    full_name: '',
    education: '',
    phone_number: '',
    experience_years: '0',
  });

  /** Skeleton rows shown while the profile loads. */
  readonly detailSkeletons = [1, 2, 3, 4];

  /** Opens or closes the profile form, seeding it from the loaded profile. */
  toggleProfileEditor(): void {
    if (this.isProfileEditMode()) {
      this.isProfileEditMode.set(false);
      return;
    }

    const profile = this.profile();
    this.profileForm.set({
      full_name: profile?.full_name ?? '',
      education: profile?.education ?? '',
      phone_number: profile?.phone_number ?? '',
      experience_years: String(profile?.experience_years ?? 0),
    });
    this.isProfileEditMode.set(true);
  }

  /** Writes one profile form field. */
  onFormChange(field: ProfileFormKey, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.profileForm.update((form) => ({ ...form, [field]: value }));
  }

  /** Persists the profile form, then refetches the profile. */
  saveProfile(): void {
    const parsed = Number(this.profileForm().experience_years);
    const experience = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;

    this.isSavingProfile.set(true);
    this.seekerService
      .updateProfile({
        full_name: this.profileForm().full_name.trim(),
        education: this.profileForm().education.trim(),
        phone_number: this.profileForm().phone_number.trim(),
        experience_years: experience,
      })
      .pipe(
        switchMap(() => this.seekerService.profile()),
        finalize(() => this.isSavingProfile.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.profileChanged.emit(profile);
          this.isProfileEditMode.set(false);
          this.toast.success('Profile updated successfully.');
        },
        error: (error: unknown) => {
          this.toast.error(this.message(error, 'Failed to update profile'));
        },
      });
  }

  /** Validates and uploads a newly picked profile photo. */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png']);
    const fileName = file.name.toLowerCase();
    const hasAllowedExtension =
      fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png');
    if (!(allowedTypes.has(file.type.toLowerCase()) || hasAllowedExtension)) {
      this.toast.error('Only JPG, JPEG, and PNG images are supported.');
      input.value = '';
      return;
    }

    this.profileImageUploading.set(true);
    this.seekerService
      .uploadPhoto(file)
      .pipe(
        switchMap(() => this.seekerService.profile()),
        finalize(() => {
          this.profileImageUploading.set(false);
          input.value = '';
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.profileChanged.emit(profile);
          this.avatarFailedChange.emit(false);
          this.toast.success('Profile photo updated successfully.');
        },
        error: (error: unknown) => {
          this.toast.error(this.message(error, 'Failed to update profile photo'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
