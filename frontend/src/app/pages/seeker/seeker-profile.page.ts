import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { assetUrl } from '../../core/http/asset-url';
import { SeekerOverview, SeekerProfile } from '../../core/models/seeker';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent, PageContainerComponent, StatusBadgeComponent } from '../../shared';
import { SeekerProfileDetailsCard } from './seeker-profile-details-card.component';

/** Fallback avatar (the React app's default company/logo image). */
const DEFAULT_LOGO = '/logos/google.png';

/** Card wrapper class including the entrance animation and its delay. */
function tileClass(index: number): string {
  const stagger = index > 0 ? `stagger-${Math.min(index, 8)}` : '';
  return `glass-card p-6 page-enter ${stagger}`;
}

/**
 * `/seeker/profile`: the seeker's identity, stats, profile details and their
 * recent applications and saved jobs.
 *
 * Port of the React `SeekerProfile`. One `overview()` call hydrates the page;
 * the edit-heavy work lives in {@link SeekerProfileDetailsCard} (which nests
 * the resume and skills editors) and reports back through `setProfile`, so a
 * single payload still drives the header, the stats and both summary lists.
 */
@Component({
  selector: 'app-seeker-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, PageContainerComponent, StatusBadgeComponent, SeekerProfileDetailsCard],
  template: `
    <app-page-container>
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-start gap-4">
          <div
            class="w-20 h-20 rounded-full border border-[#D8D2C4] bg-brand-accent/15 text-brand-accent font-bold text-xl flex items-center justify-center overflow-hidden shrink-0 mt-8"
          >
            @if (headerAvatarSrc()) {
              <img
                [src]="headerAvatarSrc()"
                [alt]="avatarAlt()"
                class="w-full h-full object-cover"
                referrerpolicy="no-referrer"
                (error)="avatarFailed.set(true)"
              />
            } @else {
              {{ initial() }}
            }
          </div>
          <div>
            <button
              type="button"
              (click)="goBack()"
              class="mb-4 text-sm text-text-muted hover:text-[#1F2A24] transition-colors inline-flex items-center gap-2"
            >
              <app-icon name="arrow-left" [size]="16" />
              Back to Dashboard
            </button>
            <h1 class="text-3xl font-display font-bold text-[#1F2A24]">Seeker Profile</h1>
            <p class="text-text-muted mt-1">Detailed personal profile and activity overview.</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        @for (item of statItems(); track item.label; let i = $index) {
          <div [class]="statTileClass(i)">
            <p class="text-xs uppercase tracking-widest text-text-muted font-bold">
              {{ item.label }}
            </p>
            <p class="text-3xl font-display font-bold text-[#1F2A24] mt-2">
              {{ loading() ? '–' : item.value }}
            </p>
          </div>
        }
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <app-seeker-profile-details-card
          [profile]="profile()"
          [loading]="loading()"
          [avatarSrc]="detailsAvatarSrc()"
          [avatarAlt]="avatarAlt()"
          (profileChanged)="setProfile($event)"
          (avatarFailedChange)="avatarFailed.set($event)"
        />

        <div class="space-y-6">
          <div class="glass-card p-8">
            <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
              <app-icon name="briefcase" [size]="20" class="text-brand-accent" />
              Recent Applications
            </h2>
            @if (loading()) {
              <div class="space-y-3">
                @for (row of listSkeletons; track row) {
                  <div class="h-12 bg-[#F1EDE4] rounded-xl animate-pulse"></div>
                }
              </div>
            } @else if (recentApplications().length === 0) {
              <p class="text-sm text-text-muted">No applications yet.</p>
            } @else {
              <div class="space-y-3">
                @for (application of recentApplications(); track application.application_id) {
                  <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-[#1F2A24] font-medium truncate">
                        {{ application.title ?? 'Untitled job' }}
                      </p>
                      <app-status-badge
                        variant="application"
                        [value]="application.status ?? 'applied'"
                      />
                    </div>
                    <p class="text-xs text-text-muted mt-1">
                      {{ application.company_name ?? 'Unknown company' }}
                    </p>
                    <div class="mt-3">
                      @if (hasValidJobId(application.job_id)) {
                        <a
                          [routerLink]="['/jobs', application.job_id]"
                          class="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold hover:bg-brand-accent/15 transition-all"
                        >
                          <app-icon name="chevron-right" [size]="14" />
                          View Job
                        </a>
                      } @else {
                        <button
                          type="button"
                          disabled
                          class="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold disabled:opacity-60"
                        >
                          <app-icon name="chevron-right" [size]="14" />
                          View Job
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="glass-card p-8">
            <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
              <app-icon name="bookmark" [size]="20" class="text-yellow-700" />
              Saved Jobs
            </h2>
            @if (loading()) {
              <div class="space-y-3">
                @for (row of listSkeletons; track row) {
                  <div class="h-12 bg-[#F1EDE4] rounded-xl animate-pulse"></div>
                }
              </div>
            } @else if (recentSavedJobs().length === 0) {
              <p class="text-sm text-text-muted">No saved jobs yet.</p>
            } @else {
              <div class="space-y-3">
                @for (job of recentSavedJobs(); track job.job_id) {
                  <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
                    <p class="text-[#1F2A24] font-medium">{{ job.title ?? 'Untitled job' }}</p>
                    <p class="text-xs text-text-muted mt-1">
                      {{ job.company_name ?? 'Unknown company' }} · {{ job.location ?? 'Remote' }}
                    </p>
                    <div class="mt-3 flex items-center gap-2">
                      @if (hasValidJobId(job.job_id)) {
                        <a
                          [routerLink]="['/jobs', job.job_id]"
                          class="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold hover:bg-brand-accent/15 transition-all"
                        >
                          <app-icon name="chevron-right" [size]="14" />
                          View Job
                        </a>
                        <button
                          type="button"
                          (click)="removeSavedJob(job.job_id)"
                          [disabled]="removingSavedJobId() === job.job_id"
                          class="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 text-xs font-bold hover:bg-red-500/15 transition-all disabled:opacity-60"
                        >
                          <app-icon name="trash" [size]="14" />
                          {{ removingSavedJobId() === job.job_id ? 'Removing...' : 'Remove' }}
                        </button>
                      } @else {
                        <button
                          type="button"
                          disabled
                          class="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold disabled:opacity-60"
                        >
                          <app-icon name="chevron-right" [size]="14" />
                          View Job
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </app-page-container>
  `,
})
export class SeekerProfilePage {
  private readonly router = inject(Router);
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Full overview payload; `null` until the request resolves. */
  private readonly overview = signal<SeekerOverview | null>(null);

  /** True until the overview request settles. */
  readonly loading = signal(true);

  /** Saved job whose removal request is in flight. */
  readonly removingSavedJobId = signal<number | null>(null);

  /** Broken-avatar guard shared by the header and the details tile. */
  readonly avatarFailed = signal(false);

  /** Skeleton rows for the two summary cards. */
  readonly listSkeletons = [1, 2, 3];

  /** Loaded profile (or `null` before the request resolves). */
  readonly profile = computed(() => this.overview()?.profile ?? null);

  /** Trimmed avatar URL; empty means "show the initial letter". */
  readonly headerAvatarSrc = computed(() =>
    this.avatarFailed() ? '' : assetUrl(this.profile()?.profile_picture_url),
  );

  /** Details tile always renders an image, mirroring the React card. */
  readonly detailsAvatarSrc = computed(() => this.headerAvatarSrc() || DEFAULT_LOGO);

  /** Alt text for either avatar rendering. */
  readonly avatarAlt = computed(() => this.profile()?.full_name ?? 'Seeker avatar');

  /** Initial letter shown when the seeker has no photo yet. */
  readonly initial = computed(() => {
    const name = String(this.profile()?.full_name ?? 'S').trim();
    return name.charAt(0).toUpperCase() || 'S';
  });

  /** Three headline counters, with React's list-based fallbacks. */
  readonly statItems = computed(() => {
    const data = this.overview();
    const stats = data?.stats ?? null;
    const applications = data?.applications ?? [];
    const savedJobs = data?.savedJobs ?? [];
    const profile = data?.profile ?? null;

    return [
      { label: 'Applications', value: stats?.total_applications ?? applications.length },
      { label: 'Saved Jobs', value: stats?.saved_jobs ?? savedJobs.length },
      { label: 'Skills', value: stats?.skills_count ?? profile?.skills?.length ?? 0 },
    ];
  });

  /** Five most recent applications. */
  readonly recentApplications = computed(() => this.overview()?.applications.slice(0, 5) ?? []);

  /** Five most recent saved jobs. */
  readonly recentSavedJobs = computed(() => this.overview()?.savedJobs.slice(0, 5) ?? []);

  constructor() {
    this.seekerService
      .overview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load your profile'));
        },
      });
  }

  /** Returns to the seeker dashboard. */
  goBack(): void {
    void this.router.navigate(['/seeker/dashboard']);
  }

  /** Card wrapper class including the entrance animation and its delay. */
  statTileClass(index: number): string {
    return tileClass(index);
  }

  /** Whether a row can link through to its job. */
  hasValidJobId(jobId?: number): boolean {
    const parsed = Number(jobId);
    return Number.isInteger(parsed) && parsed > 0;
  }

  /**
   * Applies a freshly fetched profile to the shared overview, so the header
   * avatar, the stats and the details card all stay in sync. Called by the
   * details card after a save, photo upload, resume upload or skills save.
   */
  setProfile(profile: SeekerProfile): void {
    this.overview.update((current) => (current ? { ...current, profile } : current));
  }

  /** Removes a job from the saved list shown in the summary card. */
  removeSavedJob(jobId: number): void {
    if (!Number.isInteger(jobId) || jobId <= 0) {
      return;
    }

    this.removingSavedJobId.set(jobId);
    this.seekerService
      .removeSavedJob(jobId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removingSavedJobId.set(null);
          this.overview.update((current) =>
            current
              ? {
                  ...current,
                  savedJobs: current.savedJobs.filter(
                    (job) => Number(job.job_id) !== jobId,
                  ),
                }
              : current,
          );
          this.toast.success('Removed from saved jobs.');
        },
        error: (error: unknown) => {
          this.removingSavedJobId.set(null);
          this.toast.error(this.message(error, 'Failed to remove saved job'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
