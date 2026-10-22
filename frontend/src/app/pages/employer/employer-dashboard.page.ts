import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { EmployerService } from '../../core/employer/employer.service';
import { EmployerJob, EmployerProfile, EmployerStats } from '../../core/models/employer';
import { ToastService } from '../../core/toast/toast.service';
import {
  DetailFieldCardComponent,
  IconName,
  IconComponent,
  PageContainerComponent,
  SkeletonComponent,
  StatCardComponent,
} from '../../shared';

/** Status rows rendered in the hiring-pipeline list. */
const PIPELINE_ROWS = [
  { key: 'applied', label: 'Applied', classes: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20' },
  { key: 'shortlisted', label: 'Shortlisted', classes: 'text-[#B45309] bg-yellow-500/10 border-yellow-500/20' },
  { key: 'rejected', label: 'Rejected', classes: 'text-red-600 bg-red-500/10 border-red-500/20' },
  { key: 'hired', label: 'Hired', classes: 'text-[#166534] bg-green-500/10 border-green-500/20' },
] as const;

/** Skeleton rows drawn while the page's requests are in flight. */
const SKELETON_ROWS = [1, 2, 3, 4];

/**
 * `/employer/dashboard`: KPI tiles, a company summary and the pipeline.
 *
 * Data mirrors React's `Promise.all([fetchEmployerStats(), fetchEmployerJobs(),
 * fetchEmployerProfile()])`. A missing stats or profile payload degrades to
 * values derived from the job list — the same `stats ?? jobs.length` fallbacks
 * React applies — so one empty endpoint never blanks the dashboard.
 */
@Component({
  selector: 'app-employer-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageContainerComponent,
    StatCardComponent,
    DetailFieldCardComponent,
    SkeletonComponent,
    IconComponent,
  ],
  template: `
    <app-page-container contentClassName="space-y-6">
      <header class="page-enter">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">JOBYTES</p>
        <h1 class="mt-2 text-3xl md:text-4xl font-display font-bold text-[#1F2A24]">Dashboard</h1>
        <p class="mt-3 text-text-muted">Your hiring pipeline at a glance.</p>

        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[#B45309] text-xs font-bold"
          >
            <app-icon name="building" [size]="12" /> Employer
          </span>
          <span class="text-sm font-bold text-[#1F2A24]">
            {{ profile()?.company_name || 'Your Company' }}
          </span>
          @if (profile()?.industry; as industry) {
            <span class="text-sm text-text-muted">{{ industry }}</span>
          }
        </div>
      </header>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (tile of tiles(); track tile.label; let i = $index) {
          <app-stat-card
            [label]="tile.label"
            [value]="tile.value"
            [icon]="tile.icon"
            [colorClass]="tile.colorClass"
            [loading]="loading()"
            [index]="i"
          />
        }
      </div>

      @if (error()) {
        <div class="glass-card p-8 text-center text-red-500">{{ error() }}</div>
      } @else {
        <div class="grid lg:grid-cols-2 gap-6">
          <section class="glass-card p-6">
            <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-5 flex items-center gap-2">
              <app-icon name="building" [size]="20" class="text-brand-accent" />
              Company Profile
            </h2>

            @if (loading()) {
              <div class="space-y-3">
                @for (row of rows; track row) {
                  <app-skeleton variant="text" />
                }
              </div>
            } @else {
              <div class="grid sm:grid-cols-2 gap-4">
                <app-detail-field-card
                  label="Company Name"
                  [value]="profile()?.company_name || 'Not added'"
                />
                <app-detail-field-card
                  label="Industry"
                  [value]="profile()?.industry || 'Not added'"
                />
                <app-detail-field-card
                  label="Location"
                  [value]="profile()?.company_location || 'Not added'"
                />
                <app-detail-field-card
                  label="Team Size"
                  [value]="profile()?.company_size || 'Not added'"
                />
                <app-detail-field-card
                  label="Phone"
                  [value]="profile()?.company_phone || 'Not added'"
                />
                <app-detail-field-card
                  label="Website"
                  [value]="profile()?.company_website || 'Not added'"
                />
              </div>
            }
          </section>

          <section class="glass-card p-6">
            <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-5 flex items-center gap-2">
              <app-icon name="users" [size]="20" class="text-brand-accent" />
              Hiring Pipeline
            </h2>

            <div class="space-y-3 mb-6">
              @for (row of pipeline(); track row.label) {
                <div
                  class="flex items-center justify-between px-4 py-3 rounded-xl border border-[#D8D2C4] bg-[#FAF8F3]"
                >
                  <span class="text-sm font-medium text-[#1F2A24]">{{ row.label }}</span>
                  <span class="px-3 py-1 rounded-full border text-xs font-bold {{ row.classes }}">
                    {{ loading() ? '–' : row.count }}
                  </span>
                </div>
              }
            </div>

            <div class="grid grid-cols-3 gap-3">
              @for (tile of miniTiles(); track tile.label) {
                <div class="text-center rounded-xl border border-[#D8D2C4] bg-[#FAF8F3] p-4">
                  <p class="text-xl font-display font-bold text-[#1F2A24]">
                    {{ loading() ? '–' : tile.value }}
                  </p>
                  <p class="text-xs font-bold uppercase tracking-widest text-text-muted mt-1">
                    {{ tile.label }}
                  </p>
                </div>
              }
            </div>
          </section>
        </div>
      }
    </app-page-container>
  `,
})
export class EmployerDashboardPage {
  private readonly employerService = inject(EmployerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stats = signal<EmployerStats | null>(null);
  private readonly jobs = signal<EmployerJob[]>([]);
  private readonly profileState = signal<EmployerProfile | null>(null);

  readonly loading = signal(true);
  readonly error = signal('');

  readonly profile = this.profileState.asReadonly();
  readonly rows = SKELETON_ROWS;

  /** React's `statCards` — stats first, job-list counts as the fallback. */
  readonly tiles = computed(() => {
    const stats = this.stats();
    const jobs = this.jobs();
    return [
      {
        label: 'Jobs Posted',
        value: stats?.total_jobs ?? jobs.length,
        icon: 'briefcase' as IconName,
        colorClass: 'bg-yellow-500/10 text-[#B45309]',
      },
      {
        label: 'Total Applicants',
        value: stats?.total_applications ?? 0,
        icon: 'users' as IconName,
        colorClass: 'bg-brand-accent/10 text-brand-accent',
      },
      {
        label: 'Open Listings',
        value: stats?.open_jobs ?? jobs.filter((job) => job.status === 'open').length,
        icon: 'trending-up' as IconName,
        colorClass: 'bg-green-500/10 text-[#166534]',
      },
      {
        label: 'Verified Jobs',
        value: stats?.verified_jobs ?? jobs.filter((job) => job.is_verified).length,
        icon: 'shield-check' as IconName,
        colorClass: 'bg-[#F3ECE0] text-[#1F2A24]',
      },
    ];
  });

  /** React's `applications_by_status` rows, in the order it lists them. */
  readonly pipeline = computed(() => {
    const byStatus = this.stats()?.applications_by_status;
    return PIPELINE_ROWS.map((row) => ({
      label: row.label,
      classes: row.classes,
      count: Number(byStatus?.[row.key] ?? 0),
    }));
  });

  /** Open / Closed / Verified counters under the pipeline. */
  readonly miniTiles = computed(() => {
    const stats = this.stats();
    const jobs = this.jobs();
    return [
      {
        label: 'Open',
        value: stats?.open_jobs ?? jobs.filter((job) => job.status === 'open').length,
      },
      {
        label: 'Closed',
        value: stats?.closed_jobs ?? jobs.filter((job) => job.status === 'closed').length,
      },
      {
        label: 'Verified',
        value: stats?.verified_jobs ?? jobs.filter((job) => job.is_verified).length,
      },
    ];
  });

  constructor() {
    forkJoin({
      stats: this.employerService.stats().pipe(
        catchError((error: unknown) => {
          this.report(error, 'Failed to load your statistics');
          return of(null);
        }),
      ),
      jobs: this.employerService.myJobs().pipe(
        catchError((error: unknown) => {
          this.report(error, 'Failed to load your jobs');
          return of<EmployerJob[]>([]);
        }),
      ),
      profile: this.employerService.profile().pipe(
        catchError((error: unknown) => {
          this.report(error, 'Failed to load your company profile');
          return of(null);
        }),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, jobs, profile }) => {
          this.stats.set(stats);
          this.jobs.set(jobs);
          this.profileState.set(profile);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.message(error, 'Failed to load your dashboard'));
        },
      });
  }

  /** Toasts a partial failure — the page keeps whatever did load. */
  private report(error: unknown, fallback: string): void {
    this.toast.error(this.message(error, fallback));
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
