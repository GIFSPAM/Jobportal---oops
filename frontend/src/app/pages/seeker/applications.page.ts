import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SeekerApplication, SeekerStats } from '../../core/models/seeker';
import { SeekerService } from '../../core/seeker/seeker.service';
import { ToastService } from '../../core/toast/toast.service';
import {
  IconComponent,
  IconName,
  PageContainerComponent,
  StatCardComponent,
  StatusBadgeComponent,
} from '../../shared';

/** Column headers of the applications table. */
const COLUMNS = ['Job Title', 'Company', 'Applied', 'Status', 'Actions'];

/** Skeleton rows rendered while the list loads. */
const SKELETONS = [1, 2, 3];

/**
 * `/seeker/applications`: every application with its live status, the status
 * breakdown and per-row withdraw.
 *
 * Port of the React `Applications` page plus its `SeekerApplicationsSection`;
 * revoking removes the row and decrements the counters locally just like
 * `decrementStatsAfterRevoke`.
 */
@Component({
  selector: 'app-seeker-applications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IconComponent,
    PageContainerComponent,
    StatCardComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-container>
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-3xl font-display font-bold text-[#1F2A24]">Applications</h1>
          <p class="mt-2 text-sm text-text-muted max-w-2xl">
            Review every job you have applied for, track its current status, and revoke an
            application when needed.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
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

      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
          <app-icon name="calendar" [size]="20" class="text-green-700" />
          Status Breakdown
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          @for (row of breakdownRows(); track row.label) {
            <div
              class="rounded-2xl border border-[#D8D2C4] bg-[#FAF8F3] p-4 flex items-center justify-between gap-3"
            >
              <span class="text-sm font-medium text-[#1F2A24]">{{ row.label }}</span>
              <span [class]="row.classes">
                {{ loading() ? '–' : row.value }}
              </span>
            </div>
          }
        </div>
      </div>

      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
          <app-icon name="briefcase" [size]="20" class="text-brand-accent" />
          My Applications
        </h2>

        @if (loading()) {
          <div class="space-y-3">
            @for (row of skeletons; track row) {
              <div class="h-14 bg-[#F1EDE4] rounded-xl animate-pulse"></div>
            }
          </div>
        } @else if (applications().length === 0) {
          <div class="text-center py-12">
            <div class="flex justify-center text-text-muted mb-3">
              <app-icon name="file-text" [size]="40" />
            </div>
            <p class="text-text-muted mb-4">No applications yet.</p>
            <a
              routerLink="/explore-jobs"
              class="btn-primary text-sm inline-flex items-center gap-2"
            >
              Browse Jobs
              <app-icon name="chevron-right" [size]="16" />
            </a>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-xs font-bold text-text-muted uppercase tracking-widest border-b border-[#D8D2C4]"
                >
                  @for (column of columns; track column) {
                    <th class="text-left pb-4">{{ column }}</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-[#D8D2C4]">
                @for (application of applications(); track application.application_id) {
                  <tr class="hover:bg-[#FAF8F3] transition-colors">
                    <td class="py-4 font-medium text-[#1F2A24]">
                      {{ application.title ?? 'Untitled job' }}
                    </td>
                    <td class="py-4 text-text-muted">
                      {{ application.company_name ?? 'Unknown company' }}
                    </td>
                    <td class="py-4 text-text-muted">{{ appliedLabel(application.applied_at) }}</td>
                    <td class="py-4">
                      <app-status-badge
                        variant="application"
                        [value]="application.status ?? 'applied'"
                      />
                    </td>
                    <td class="py-4">
                      <div class="flex items-center gap-2">
                        @if (hasValidJobId(application)) {
                          <a
                            [routerLink]="['/jobs', application.job_id]"
                            class="inline-flex items-center justify-center min-w-28 px-3 py-2 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold hover:bg-brand-accent/15 transition-all"
                          >
                            <app-icon name="chevron-right" [size]="14" />
                            View Job
                          </a>
                        } @else {
                          <button
                            type="button"
                            disabled
                            class="inline-flex items-center justify-center min-w-28 px-3 py-2 rounded-lg border border-brand-accent/20 bg-brand-accent/10 text-brand-accent text-xs font-bold disabled:opacity-60"
                          >
                            <app-icon name="chevron-right" [size]="14" />
                            View Job
                          </button>
                        }
                        <button
                          type="button"
                          (click)="revoke(application.application_id)"
                          [disabled]="
                            revokingId() === application.application_id ||
                            !isValidApplicationId(application)
                          "
                          class="inline-flex items-center justify-center min-w-28 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 text-xs font-bold hover:bg-red-500/15 transition-all disabled:opacity-60"
                        >
                          <app-icon name="undo" [size]="14" />
                          {{ revokingId() === application.application_id ? 'Revoking...' : 'Revoke' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </app-page-container>
  `,
})
export class SeekerApplicationsPage {
  private readonly seekerService = inject(SeekerService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Application rows currently listed. */
  readonly applications = signal<SeekerApplication[]>([]);

  /** Stats counters; `null` until the request resolves. */
  private readonly stats = signal<SeekerStats | null>(null);

  /** True until both requests settle. */
  readonly loading = signal(true);

  /** Application whose revoke request is in flight. */
  readonly revokingId = signal<number | null>(null);

  /** Column headers of the table. */
  readonly columns = COLUMNS;

  /** Skeleton rows shown while the list loads. */
  readonly skeletons = SKELETONS;

  /** Three headline counters, with React's list-based fallbacks. */
  readonly statCards = computed(() => {
    const stats = this.stats();
    const applications = this.applications();
    const countByStatus = (status: string): number =>
      applications.filter((item) => String(item.status ?? '').toLowerCase() === status).length;

    return [
      {
        label: 'Applications',
        value: stats?.total_applications ?? applications.length,
        icon: 'file-text' as IconName,
        color: 'text-brand-accent bg-brand-accent/10',
      },
      {
        label: 'Shortlisted',
        value: stats?.applications_by_status?.shortlisted ?? countByStatus('shortlisted'),
        icon: 'calendar' as IconName,
        color: 'text-green-700 bg-green-500/10',
      },
      {
        label: 'Applied',
        value: stats?.applications_by_status?.applied ?? countByStatus('applied'),
        icon: 'search' as IconName,
        color: 'text-blue-700 bg-blue-500/10',
      },
    ];
  });

  /** Status Breakdown tiles with their badge colours. */
  readonly breakdownRows = computed(() => {
    const byStatus = this.stats()?.applications_by_status;
    return [
      {
        label: 'Applied',
        value: byStatus?.applied ?? 0,
        classes: 'px-3 py-1 rounded-full border text-xs font-bold text-blue-700 bg-blue-500/10 border-blue-500/20',
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
    forkJoin({
      applications: this.seekerService.applications(),
      stats: this.seekerService.stats(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ applications, stats }) => {
          this.applications.set(applications);
          this.stats.set(stats);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to fetch applications'));
        },
      });
  }

  /** Withdraws an application and decrements the local counters. */
  revoke(applicationId: number): void {
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return;
    }

    const target = this.applications().find(
      (item) => Number(item.application_id) === applicationId,
    );
    this.revokingId.set(applicationId);
    this.seekerService
      .revoke(applicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.revokingId.set(null);
          this.applications.update((list) =>
            list.filter((item) => Number(item.application_id) !== applicationId),
          );
          this.stats.update((current) =>
            this.decrementStatsAfterRevoke(current, target?.status),
          );
          this.toast.success('Application revoked.');
        },
        error: (error: unknown) => {
          this.revokingId.set(null);
          this.toast.error(this.message(error, 'Failed to revoke application'));
        },
      });
  }

  /** Applied date, or an em-dash when the row carries none. */
  appliedLabel(value?: string): string {
    if (!value) {
      return '–';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '–' : parsed.toLocaleDateString();
  }

  /** Whether the row can link through to its job. */
  hasValidJobId(application: SeekerApplication): boolean {
    const jobId = Number(application.job_id);
    return Number.isInteger(jobId) && jobId > 0;
  }

  /** Guards the revoke action against a missing application id. */
  isValidApplicationId(application: SeekerApplication): boolean {
    const applicationId = Number(application.application_id);
    return Number.isInteger(applicationId) && applicationId > 0;
  }

  /**
   * Drops one application from the counters (port of React
   * `decrementStatsAfterRevoke`), clamped at zero.
   */
  private decrementStatsAfterRevoke(
    stats: SeekerStats | null,
    status?: string,
  ): SeekerStats | null {
    if (!stats) {
      return stats;
    }

    const statusKey = String(status ?? '').toLowerCase();
    const currentBucket = Number(stats.applications_by_status?.[statusKey] ?? 0);

    return {
      ...stats,
      total_applications: Math.max(0, Number(stats.total_applications ?? 0) - 1),
      applications_by_status: {
        ...stats.applications_by_status,
        ...(statusKey ? { [statusKey]: Math.max(0, currentBucket - 1) } : {}),
      },
    };
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
