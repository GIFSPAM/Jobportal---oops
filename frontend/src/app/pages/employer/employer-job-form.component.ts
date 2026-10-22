import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { JobTypePipe } from '../../shared/pipes/job-type.pipe';
import { JobDraft } from '../../core/models/employer';

/** Employment types offered by the form (the API's `job_type` vocabulary). */
const JOB_TYPES = ['full_time', 'part_time', 'internship'] as const;

/** Editable form state — every value kept as a string until submit. */
interface JobFormState {
  title: string;
  description: string;
  location: string;
  job_type: (typeof JOB_TYPES)[number];
  salary_min: string;
  salary_max: string;
}

const EMPTY_FORM: JobFormState = {
  title: '',
  description: '',
  location: '',
  job_type: 'full_time',
  salary_min: '',
  salary_max: '',
};

/**
 * The plan's `JobForm`: validated posting editor shared by post and edit.
 *
 * Validation runs client-side first (required fields, numeric range) so the
 * user never waits on a round-trip to learn the form is wrong; the parent page
 * only deals with a clean {@link JobDraft}.
 */
@Component({
  selector: 'app-employer-job-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JobTypePipe],
  template: `
    <form (submit)="submit($event)" class="grid sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2 space-y-1">
        <label for="job-title" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Job Title *
        </label>
        <input
          id="job-title"
          type="text"
          class="input-field"
          placeholder="Senior Frontend Engineer"
          [value]="form().title"
          (input)="patch('title', $event)"
        />
      </div>

      <div class="sm:col-span-2 space-y-1">
        <label for="job-description" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Description *
        </label>
        <textarea
          id="job-description"
          rows="7"
          class="input-field resize-y"
          placeholder="Responsibilities, requirements, benefits…"
          [value]="form().description"
          (input)="patch('description', $event)"
        ></textarea>
      </div>

      <div class="space-y-1">
        <label for="job-location" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Location *
        </label>
        <input
          id="job-location"
          type="text"
          class="input-field"
          placeholder="Austin, TX / Remote"
          [value]="form().location"
          (input)="patch('location', $event)"
        />
      </div>

      <div class="space-y-1">
        <label for="job-type" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Job Type *
        </label>
        <select
          id="job-type"
          class="input-field"
          [value]="form().job_type"
          (change)="patchType($event)"
        >
          @for (type of jobTypes; track type) {
            <option [value]="type">{{ type | jobType }}</option>
          }
        </select>
      </div>

      <div class="space-y-1">
        <label for="job-salary-min" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Salary Min
        </label>
        <input
          id="job-salary-min"
          type="number"
          min="0"
          class="input-field"
          placeholder="110000"
          [value]="form().salary_min"
          (input)="patch('salary_min', $event)"
        />
      </div>

      <div class="space-y-1">
        <label for="job-salary-max" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Salary Max
        </label>
        <input
          id="job-salary-max"
          type="number"
          min="0"
          class="input-field"
          placeholder="150000"
          [value]="form().salary_max"
          (input)="patch('salary_max', $event)"
        />
      </div>

      <div class="sm:col-span-2 space-y-1">
        <label for="job-skills" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Skills
        </label>
        <input
          id="job-skills"
          type="text"
          class="input-field"
          placeholder="TypeScript, Angular, TailwindCSS"
          [value]="skillsText()"
          (input)="onSkillsInput($event)"
        />
        <p class="text-xs text-text-muted">Separate skills with commas.</p>
        @if (skillTags().length > 0) {
          <div class="flex flex-wrap gap-2 pt-1">
            @for (skill of skillTags(); track skill) {
              <span class="chip-parchment px-3 py-1 rounded-full text-xs font-bold">
                {{ skill }}
              </span>
            }
          </div>
        }
      </div>

      @if (formError()) {
        <p class="sm:col-span-2 text-sm font-bold text-red-500">{{ formError() }}</p>
      }

      <div class="sm:col-span-2 flex items-center gap-3 pt-2">
        <button
          type="submit"
          [disabled]="submitting()"
          class="btn-primary px-7 py-3 rounded-full text-sm font-bold disabled:opacity-60"
        >
          {{ submitting() ? 'Saving…' : submitLabel() }}
        </button>
        <ng-content />
      </div>
    </form>
  `,
})
export class EmployerJobFormComponent {
  /** Prefill values for the edit flow. */
  readonly initial = input<Partial<JobDraft> | null>(null);

  /** Disables the submit button while the request is in flight. */
  readonly submitting = input(false);

  /** Submit button label — "Post Job" vs "Save Changes". */
  readonly submitLabel = input('Post Job');

  /** Emits a validated draft; the parent performs the API call. */
  readonly submitted = output<JobDraft>();

  readonly jobTypes = JOB_TYPES;

  readonly form = signal<JobFormState>({ ...EMPTY_FORM });

  readonly skillsText = signal('');

  readonly formError = signal('');

  /** Applies prefilled values when the `initial` input arrives. */
  syncInitial(initial: Partial<JobDraft> | null): void {
    if (!initial) return;
    this.form.set({
      title: initial.title ?? '',
      description: initial.description ?? '',
      location: initial.location ?? '',
      job_type: (JOB_TYPES as readonly string[]).includes(initial.job_type ?? '')
        ? ((initial.job_type as JobFormState['job_type']) ?? 'full_time')
        : 'full_time',
      salary_min: initial.salary_min === null || initial.salary_min === undefined ? '' : String(initial.salary_min),
      salary_max: initial.salary_max === null || initial.salary_max === undefined ? '' : String(initial.salary_max),
    });
    this.skillsText.set((initial.skills ?? []).join(', '));
  }

  /** Parsed skill tags derived from the free-text field. */
  skillTags(): string[] {
    return this.skillsText()
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0);
  }

  /** Writes one string field back into the form signal. */
  patch(key: keyof JobFormState, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.form.update((form) => ({ ...form, [key]: value }));
  }

  /** Select control has its own event target type. */
  patchType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as JobFormState['job_type'];
    this.form.update((form) => ({ ...form, job_type: value }));
  }

  onSkillsInput(event: Event): void {
    this.skillsText.set((event.target as HTMLInputElement).value);
  }

  /** Validates, normalises and emits the draft. */
  submit(event: Event): void {
    event.preventDefault();

    const form = this.form();
    const title = form.title.trim();
    const description = form.description.trim();
    const location = form.location.trim();

    if (!title || !description || !location) {
      this.formError.set('Title, description and location are required.');
      return;
    }

    const min = form.salary_min.trim();
    const max = form.salary_max.trim();

    if ((min && !Number.isFinite(Number(min))) || (max && !Number.isFinite(Number(max)))) {
      this.formError.set('Salaries must be numbers.');
      return;
    }

    if (min && max && Number(min) > Number(max)) {
      this.formError.set('Minimum salary cannot exceed the maximum.');
      return;
    }

    this.formError.set('');
    this.submitted.emit({
      title,
      description,
      location,
      job_type: form.job_type,
      salary_min: min ? Number(min) : null,
      salary_max: max ? Number(max) : null,
      skills: this.skillTags(),
    });
  }
}
