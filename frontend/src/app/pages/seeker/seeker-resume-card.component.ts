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

/**
 * Resume upload / download block inside the profile details card.
 *
 * Owns its own upload and download flags plus file validation, and emits the
 * refetched profile on success so the page can fold it into the shared
 * overview — the same write-back path every editor on this page uses, which
 * keeps a single `overview()` request behind the whole screen.
 */
@Component({
  selector: 'app-seeker-resume-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4 mb-6">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p
            class="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2"
          >
            <app-icon name="file-text" [size]="16" />
            Resume
          </p>
          <p class="text-[#1F2A24] font-medium">
            {{ resumeFilename() ?? 'No resume uploaded yet' }}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <input
            #resumeInput
            type="file"
            accept="application/pdf"
            aria-label="Choose a PDF resume"
            (change)="onResumeSelected($event)"
            class="hidden"
          />
          <button
            type="button"
            (click)="resumeInput.click()"
            [disabled]="resumeUploading()"
            class="inline-flex items-center justify-center min-w-40 px-4 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-700 text-sm font-bold hover:bg-yellow-500/15 transition-all disabled:opacity-50"
          >
            <app-icon name="plus" [size]="16" />
            {{ resumeUploading() ? 'Uploading...' : 'Upload New Resume' }}
          </button>
          <button
            type="button"
            (click)="downloadResume()"
            [disabled]="!resumeFilename() || resumeDownloading()"
            class="inline-flex items-center justify-center min-w-40 px-4 py-2.5 rounded-xl border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-sm font-bold hover:bg-brand-accent/15 transition-all disabled:opacity-50"
          >
            <app-icon name="file-text" [size]="16" />
            {{ resumeDownloading() ? 'Downloading...' : 'Download Resume' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SeekerResumeCard {
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** `resume_filename` of the loaded profile; `null` before the fetch settles. */
  readonly resumeFilename = input<string | null>(null);

  /** Emits the refetched profile after a successful upload. */
  readonly profileChanged = output<SeekerProfile>();

  /** True while the upload request is in flight. */
  readonly resumeUploading = signal(false);

  /** True while the download request is in flight. */
  readonly resumeDownloading = signal(false);

  /** Validates and uploads a newly picked PDF resume. */
  onResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.toast.error('Please upload a PDF resume file.');
      input.value = '';
      return;
    }

    this.resumeUploading.set(true);
    this.seekerService
      .uploadResume(file)
      .pipe(
        switchMap(() => this.seekerService.profile()),
        finalize(() => {
          this.resumeUploading.set(false);
          input.value = '';
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.profileChanged.emit(profile);
          this.toast.success('Resume updated successfully.');
        },
        error: (error: unknown) => {
          this.toast.error(this.message(error, 'Failed to update resume'));
        },
      });
  }

  /**
   * Downloads the stored resume as a file.
   *
   * Deviation from React: the endpoint needs the bearer header, so the blob
   * route is used instead of opening the URL directly (which would 401).
   */
  downloadResume(): void {
    const filename = this.resumeFilename() ?? 'resume.pdf';
    this.resumeDownloading.set(true);
    this.seekerService
      .downloadResume()
      .pipe(
        finalize(() => this.resumeDownloading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
          this.toast.success('Resume download started.');
        },
        error: (error: unknown) => {
          this.toast.error(this.message(error, 'Failed to download resume'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
