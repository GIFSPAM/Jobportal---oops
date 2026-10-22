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
import { SeekerProfile, SeekerSkill } from '../../core/models/seeker';
import { SeekerService, SkillInput } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent } from '../../shared';

/** Coerces any stored proficiency string onto the API's allowed vocabulary. */
function toProficiency(value: string): SkillInput['proficiency'] {
  const normalized = value.trim().toLowerCase();
  return normalized === 'beginner' || normalized === 'intermediate' || normalized === 'advanced'
    ? normalized
    : 'intermediate';
}

/**
 * Read-only skill chips with an inline add/remove/reorder editor.
 *
 * Skills are a full-replacement write (`PUT /seeker/skills`), so the draft list
 * is owned here and sent whole on save; success emits the refetched profile so
 * the page can fold it into the shared overview.
 */
@Component({
  selector: 'app-seeker-skills-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div>
      <div class="flex items-center justify-between gap-3 mb-3">
        <p
          class="text-xs font-bold uppercase tracking-widest text-text-muted flex items-center gap-2"
        >
          <app-icon name="zap" [size]="16" />
          Skills
        </p>
        @if (!isSkillsEditMode()) {
          <button
            type="button"
            (click)="openSkillsEditor()"
            [disabled]="isSavingSkills()"
            class="text-xs font-bold text-brand-accent hover:text-brand-accent/80 transition-colors disabled:opacity-60"
          >
            Edit Skills
          </button>
        }
      </div>

      @if (isSkillsEditMode()) {
        <div class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <label for="seeker-new-skill" class="sr-only">Skill name</label>
            <input
              id="seeker-new-skill"
              type="text"
              class="input-field h-10 flex-1 min-w-40 text-sm"
              placeholder="Add skill name"
              [value]="newSkillName()"
              (input)="onNewSkillNameChange($event)"
              (keydown.enter)="onAddSkill($event)"
            />
            <label for="seeker-new-proficiency" class="sr-only">Proficiency</label>
            <select
              id="seeker-new-proficiency"
              class="input-field h-10 min-w-36 text-sm"
              [value]="newSkillProficiency()"
              (change)="onNewSkillProficiencyChange($event)"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button
              type="button"
              (click)="onAddSkill()"
              aria-label="Add skill"
              class="inline-flex items-center justify-center px-3 h-10 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/15 transition-all"
            >
              <app-icon name="plus" [size]="16" />
            </button>
          </div>

          <div class="space-y-2">
            @if (skillsForm().length > 0) {
              @for (skill of skillsForm(); track $index; let i = $index) {
                <div
                  class="flex items-center justify-between gap-3 rounded-xl border border-brand-accent/20 bg-brand-accent/10 px-3 py-2"
                >
                  <span class="text-xs font-bold text-brand-accent capitalize">
                    {{ skill.name }}
                  </span>
                  <div class="flex items-center gap-2">
                    <label [for]="'seeker-skill-proficiency-' + i" class="sr-only">
                      Proficiency for {{ skill.name }}
                    </label>
                    <select
                      [id]="'seeker-skill-proficiency-' + i"
                      class="input-field h-8 min-w-32 text-xs"
                      [value]="skill.proficiency"
                      (change)="onSkillProficiencyChange(i, $event)"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <button
                      type="button"
                      (click)="removeSkill(i)"
                      [attr.aria-label]="'Remove ' + skill.name"
                      class="inline-flex items-center justify-center rounded-md p-1 text-text-muted hover:text-red-700 transition-colors"
                    >
                      <app-icon name="x" [size]="14" />
                    </button>
                  </div>
                </div>
              }
            } @else {
              <span class="text-sm text-text-muted">No skills added yet.</span>
            }
          </div>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              (click)="saveSkills()"
              [disabled]="isSavingSkills()"
              class="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-green-500/20 bg-green-500/10 text-green-700 text-xs font-bold hover:bg-green-500/15 transition-all disabled:opacity-60"
            >
              {{ isSavingSkills() ? 'Saving...' : 'Save Skills' }}
            </button>
            <button
              type="button"
              (click)="closeSkillsEditor()"
              [disabled]="isSavingSkills()"
              class="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-[#D8D2C4] text-text-muted text-xs font-bold hover:text-[#1F2A24] transition-all disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      } @else if (skills().length > 0) {
        <div class="flex flex-wrap gap-2">
          @for (skill of skills(); track $index) {
            <span
              class="px-3 py-1.5 rounded-full border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold capitalize"
            >
              {{ skill.name }} · {{ skill.proficiency }}
            </span>
          }
        </div>
      } @else {
        <span class="text-sm text-text-muted">No skills added yet.</span>
      }
    </div>
  `,
})
export class SeekerSkillsEditor {
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Saved skills shown in read-only chip mode. */
  readonly skills = input<SeekerSkill[]>([]);

  /** Emits the refetched profile after a successful save. */
  readonly profileChanged = output<SeekerProfile>();

  /** Draft editor state — discarded on cancel, replaced on open. */
  readonly isSkillsEditMode = signal(false);
  readonly isSavingSkills = signal(false);
  readonly skillsForm = signal<SeekerSkill[]>([]);
  readonly newSkillName = signal('');
  readonly newSkillProficiency = signal('intermediate');

  /** Seeds the draft from the saved skills and opens the editor. */
  openSkillsEditor(): void {
    const skills = this.skills();
    this.skillsForm.set(skills.length ? skills.map((skill) => ({ ...skill })) : []);
    this.newSkillName.set('');
    this.newSkillProficiency.set('intermediate');
    this.isSkillsEditMode.set(true);
  }

  /** Closes the editor and discards the draft. */
  closeSkillsEditor(): void {
    this.isSkillsEditMode.set(false);
    this.skillsForm.set([]);
    this.newSkillName.set('');
  }

  /** Reads the new-skill text input. */
  onNewSkillNameChange(event: Event): void {
    this.newSkillName.set((event.target as HTMLInputElement).value);
  }

  /** Reads the new-skill proficiency select. */
  onNewSkillProficiencyChange(event: Event): void {
    this.newSkillProficiency.set((event.target as HTMLSelectElement).value);
  }

  /** Appends the drafted skill after validating name and duplicates. */
  onAddSkill(event?: Event): void {
    event?.preventDefault();
    const name = this.newSkillName().trim();
    if (!name) {
      this.toast.error('Skill name cannot be empty');
      return;
    }
    if (this.skillsForm().some((skill) => skill.name.toLowerCase() === name.toLowerCase())) {
      this.toast.error('Skill already added');
      return;
    }

    this.skillsForm.update((skills) => [
      ...skills,
      { name, proficiency: this.newSkillProficiency() },
    ]);
    this.newSkillName.set('');
    this.newSkillProficiency.set('intermediate');
  }

  /** Drops a draft skill by index. */
  removeSkill(index: number): void {
    this.skillsForm.update((skills) => skills.filter((_, i) => i !== index));
  }

  /** Rewrites one draft skill's proficiency. */
  onSkillProficiencyChange(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.skillsForm.update((skills) =>
      skills.map((skill, i) => (i === index ? { ...skill, proficiency: value } : skill)),
    );
  }

  /** Persists the full skill list, then refetches the profile. */
  saveSkills(): void {
    const payload: SkillInput[] = this.skillsForm().map((skill) => ({
      name: skill.name,
      proficiency: toProficiency(skill.proficiency),
    }));

    this.isSavingSkills.set(true);
    this.seekerService
      .updateSkills(payload)
      .pipe(
        switchMap(() => this.seekerService.profile()),
        finalize(() => this.isSavingSkills.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.profileChanged.emit(profile);
          this.isSkillsEditMode.set(false);
          this.skillsForm.set([]);
          this.toast.success('Skills updated successfully.');
        },
        error: (error: unknown) => {
          this.toast.error(this.message(error, 'Failed to update skills'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
