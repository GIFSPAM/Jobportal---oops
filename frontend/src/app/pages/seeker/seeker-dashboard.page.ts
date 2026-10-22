import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SeekerOverview } from '../../core/models/seeker';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent, IconName, PageContainerComponent, StatCardComponent } from '../../shared';

/** The four KPI tiles shown above the overview cards. */
interface StatTile {
  label: string;
  value: number;
  icon: IconName;
  color: string;
}

/** One row of the Application Breakdown card. */
interface BreakdownRow {
  label: string;
  value: number;
  classes: string;
}

/**
 * `/seeker/dashboard`: headline numbers, application breakdown, saved-job
 * preview and the two quick-access cards.
 *
 * Port of the React `SeekerDashboard`; a single `overview()` call hydrates the
 * whole page exactly like `fetchSeekerOverview`.
 */
@Component({
  selector: 'app-seeker-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, PageContainerComponent, StatCardComponent],
  template: `
    <app-page-container contentClassName="space-y-6">
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div>
          @if (loading()) {
            <div class="h-8 w-56 bg-[#F1EDE4] rounded-lg animate-pulse"></div>
          } @else {
            <h1 class="text-3xl font-display font-bold text-[#1F2A24]">{{ displayName() }}</h1>
          }
          <div class="flex items-center gap-2 mt-2">
            <span
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-bold"
            >
              <app-icon name="user" [size]="12" />
              Job Seeker
            </span>
            @if (education()) {
              <span class="text-sm text-text-muted">{{ education() }}</span>
            }
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          @for (card of statCards(); track card.label; let i = $index) {
            <app-stat-card
              [label]="card.label"
              [value]="card.value"
              [icon]="card.icon"
              [colorClass]="card.color"
              [loading]="loading()"
              [index]="i"
            />
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div class="glass-card p-8">
            <h2
              class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2"
            >
              <app-icon name="calendar" [size]="20" class="text-green-700" />
              Application Breakdown
            </h2>
            <div class="space-y-3">
              @for (row of breakdownRows(); track row.label) {
                <div
                  class="flex items-center justify-between rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] px-4 py-3"
                >
                  <span class="text-sm font-medium text-[#1F2A24]">{{ row.label }}</span>
                  <span [class]="row.classes">
                    {{ loading() ? '–' : row.value }}
                  </span>
                </div>
              }
            </div>
            <a
              routerLink="/seeker/applications"
              class="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent font-semibold hover:bg-brand-accent/15 transition-all"
            >
              View All Applications
              <app-icon name="arrow-right" [size]="16" />
            </a>
          </div>

          <div class="glass-card p-8">
            <h2
              class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2"
            >
              <app-icon name="bookmark" [size]="20" class="text-yellow-700" />
              Saved Jobs Preview
            </h2>
            @if (loading()) {
              <div class="space-y-3">
                @for (row of previewSkeletons; track row) {
                  <div class="h-12 bg-[#F1EDE4] rounded-xl animate-pulse"></div>
                }
              </div>
            } @else if (savedJobsPreview().length === 0) {
              <p class="text-sm text-text-muted">No saved jobs yet.</p>
            } @else {
              <div class="space-y-3">
                @for (job of savedJobsPreview(); track job.job_id) {
                  <div class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
                    <p class="text-[#1F2A24] font-medium">{{ job.title }}</p>
                    <p class="text-xs text-text-muted mt-1">
                      {{ job.company_name }} · {{ job.location ?? 'Remote' }}
                    </p>
                  </div>
                }
              </div>
            }
            <a
              routerLink="/seeker/saved-jobs"
              class="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-700 font-semibold hover:bg-yellow-500/15 transition-all"
            >
              View All Saved Jobs
              <app-icon name="arrow-right" [size]="16" />
            </a>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            routerLink="/seeker/profile"
            class="glass-card p-6 flex items-center justify-between hover:border-brand-accent/40 transition-all group"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-accent/10 text-brand-accent"
              >
                <app-icon name="user" [size]="20" />
              </div>
              <div class="text-left">
                <p class="text-sm font-bold text-[#1F2A24]">Manage Profile</p>
                <p class="text-xs text-text-muted mt-1">Edit personal info &amp; skills</p>
              </div>
            </div>
            <app-icon name="arrow-right" [size]="20" />
          </a>

          <a
            routerLink="/explore-jobs"
            class="glass-card p-6 flex items-center justify-between hover:border-green-400/40 transition-all group"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/10 text-green-700"
              >
                <app-icon name="bookmark" [size]="20" />
              </div>
              <div class="text-left">
                <p class="text-sm font-bold text-[#1F2A24]">Browse Jobs</p>
                <p class="text-xs text-text-muted mt-1">Explore available positions</p>
              </div>
            </div>
            <app-icon name="arrow-right" [size]="20" />
          </a>
        </div>
      </div>
    </app-page-container>
  `,
})
export class SeekerDashboardPage {
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Full overview payload; `null` until the request resolves. */
  private readonly overview = signal<SeekerOverview | null>(null);

  /** True until the overview request settles. */
  readonly loading = signal(true);

  /** Skeleton rows for the saved-jobs preview. */
  readonly previewSkeletons = [1, 2, 3];

  /** Greeting: the seeker's name, or `Welcome` before one is on file. */
  readonly displayName = computed(() => this.overview()?.profile?.full_name ?? 'Welcome');

  /** Education line shown next to the role pill, when present. */
  readonly education = computed(() => this.overview()?.profile?.education ?? '');

  /** Saved jobs trimmed to the preview length. */
  readonly savedJobsPreview = computed(() => this.overview()?.savedJobs.slice(0, 4) ?? []);

  /** KPI tiles — stats first, list/profile payloads as React's fallbacks. */
  readonly statCards = computed<StatTile[]>(() => {
    const data = this.overview();
    const stats = data?.stats ?? null;
    const applications = data?.applications ?? [];
    const profile = data?.profile ?? null;
    const shortlisted = applications.filter(
      (application) => String(application.status ?? '').toLowerCase() === 'shortlisted',
    ).length;

    return [
      {
        label: 'Applications',
        value: stats?.total_applications ?? applications.length,
        icon: 'file-text',
        color: 'text-brand-accent bg-brand-accent/10',
      },
      {
        label: 'Saved Jobs',
        value: stats?.saved_jobs ?? 0,
        icon: 'bookmark',
        color: 'text-yellow-700 bg-yellow-500/10',
      },
      {
        label: 'Shortlisted',
        value: stats?.applications_by_status?.shortlisted ?? shortlisted,
        icon: 'calendar',
        color: 'text-green-700 bg-green-500/10',
      },
      {
        label: 'Skills',
        value: stats?.skills_count ?? profile?.skills?.length ?? 0,
        icon: 'zap',
        color: 'text-[#1F2A24] bg-[#F1EDE4]',
      },
    ];
  });

  /** Application Breakdown rows with their badge colours. */
  readonly breakdownRows = computed<BreakdownRow[]>(() => {
    const byStatus = this.overview()?.stats?.applications_by_status;
    return [
      {
        label: 'Applied',
        value: byStatus?.applied ?? 0,
        classes: 'px-3 py-1 rounded-full border text-xs font-bold text-brand-accent bg-brand-accent/10 border-brand-accent/20',
      },
      {
        label: 'Shortlisted',
        value: byStatus?.shortlisted ?? 0,
        classes: 'px-3 py-1 rounded-full border text-xs font-bold text-yellow-700 bg-yellow-500/10 border-yellow-500/20',
      },
      {
        label: 'Rejected',
        value: byStatus?.rejected ?? 0,
        classes: 'px-3 py-1 rounded-full border text-xs font-bold text-red-700 bg-red-500/10 border-red-500/20',
      },
      {
        label: 'Hired',
        value: byStatus?.hired ?? 0,
        classes: 'px-3 py-1 rounded-full border text-xs font-bold text-green-700 bg-green-500/10 border-green-500/20',
      },
    ];
  });

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
          this.toast.error(this.message(error, 'Failed to load your dashboard'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
