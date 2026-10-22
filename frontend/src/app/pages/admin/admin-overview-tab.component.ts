import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { AdminJob, AdminStats, AdminUser } from '../../core/models/admin';
import { IconComponent } from '../../shared';
import { roleBadgeClass, rolePillLabel } from './admin-format';

/** One label/value/colour row inside an overview stat card. */
interface OverviewRow {
  label: string;
  value: number;
  cls: string;
}

/** A recent-user row: email plus its role pill. */
interface RecentUserRow {
  email: string;
  roleLabel: string;
  roleClass: string;
}

/** Placeholder bars shown while the dashboard data is still loading. */
const SKELETON_ROWS = [1, 2, 3];

/**
 * `overview` tab of the admin dashboard.
 *
 * Pure presentation: the page passes the already-loaded stats/users/jobs and
 * this component only derives the four cards (mirrors the React
 * `AdminOverviewTab`, including its per-row fallback counts).
 */
@Component({
  selector: 'app-admin-overview-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgClass],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
          <app-icon class="text-brand-accent" name="user" [size]="20" /> Platform User Mix
        </h2>
        <div class="space-y-3">
          @for (row of userMixRows(); track row.label) {
            <div
              class="flex items-center justify-between rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] px-4 py-3"
            >
              <span class="text-sm font-medium text-[#1F2A24]">{{ row.label }}</span>
              <span class="px-3 py-1 rounded-full border text-xs font-bold" [ngClass]="row.cls">
                {{ loading() ? '–' : row.value }}
              </span>
            </div>
          }
        </div>
      </div>

      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
          <app-icon class="text-green-700" name="check-circle" [size]="20" /> Application Flow
        </h2>
        <div class="space-y-3">
          @for (row of applicationRows(); track row.label) {
            <div
              class="flex items-center justify-between rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] px-4 py-3"
            >
              <span class="text-sm font-medium text-[#1F2A24]">{{ row.label }}</span>
              <span class="px-3 py-1 rounded-full border text-xs font-bold" [ngClass]="row.cls">
                {{ row.value }}
              </span>
            </div>
          }
        </div>
      </div>

      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
          <app-icon class="text-red-700" name="x-circle" [size]="20" /> Pending Verification
        </h2>
        @if (loading()) {
          <div class="space-y-3">
            @for (row of skeletonRows; track row) {
              <div class="h-12 bg-[#FAF8F3] rounded-xl animate-pulse"></div>
            }
          </div>
        } @else if (pendingJobs().length === 0) {
          <div class="text-center py-10">
            <div class="flex justify-center mb-2">
              <app-icon class="text-green-700" name="check-circle" [size]="36" />
            </div>
            <p class="text-text-muted text-sm">All jobs are verified.</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (job of pendingPreview(); track job.job_id) {
              <div
                class="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F3] border border-[#EFE9DD] hover:border-[#E8E3D8] transition-all"
              >
                <div>
                  <p class="text-sm font-medium text-[#1F2A24]">{{ job.title }}</p>
                  <p class="text-xs text-text-muted">{{ job.company_name }}</p>
                </div>
                <span
                  class="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-700 border border-red-500/20 font-bold"
                >
                  Unverified
                </span>
              </div>
            }
          </div>
        }
      </div>

      <div class="glass-card p-8">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] mb-6 flex items-center gap-2">
          <app-icon class="text-brand-accent" name="users" [size]="20" /> Recent Users
        </h2>
        @if (loading()) {
          <div class="space-y-3">
            @for (row of skeletonRows; track row) {
              <div class="h-12 bg-[#FAF8F3] rounded-xl animate-pulse"></div>
            }
          </div>
        } @else if (users().length === 0) {
          <p class="text-text-muted text-sm text-center py-10">No users yet.</p>
        } @else {
          <div class="space-y-3">
            @for (row of recentUsers(); track row.email) {
              <div
                class="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F3] border border-[#EFE9DD] hover:border-[#E8E3D8] transition-all"
              >
                <p class="text-sm text-[#1F2A24] truncate max-w-[60%]">{{ row.email }}</p>
                <span
                  class="text-xs px-2 py-1 rounded-full border font-bold capitalize"
                  [ngClass]="row.roleClass"
                >
                  {{ row.roleLabel }}
                </span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminOverviewTabComponent {
  /** True while the dashboard's four requests are still in flight. */
  readonly loading = input(false);

  /** Platform counters, or `null` before the first successful load. */
  readonly stats = input<AdminStats | null>(null);

  /** All accounts (used as the fallback counts when stats are missing). */
  readonly users = input<AdminUser[]>([]);

  /** All jobs (used as the fallback counts when stats are missing). */
  readonly jobs = input<AdminJob[]>([]);

  /** Jobs still awaiting verification. */
  readonly pendingJobs = input<AdminJob[]>([]);

  /** Pulse bars rendered in place of the pending/recent lists. */
  readonly skeletonRows = SKELETON_ROWS;

  /** Employers/seekers/verified/open counters with list-based fallbacks. */
  readonly userMixRows = computed<OverviewRow[]>(() => {
    const stats = this.stats();
    const users = this.users();
    const jobs = this.jobs();
    return [
      {
        label: 'Employers',
        value: stats?.users?.employers ?? users.filter((user) => user.role === 'employer').length,
        cls: 'text-yellow-700 bg-yellow-500/10 border-yellow-500/20',
      },
      {
        label: 'Seekers',
        value: stats?.users?.seekers ?? users.filter((user) => user.role === 'jobseeker').length,
        cls: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20',
      },
      {
        label: 'Verified Jobs',
        value: stats?.jobs?.verified ?? jobs.filter((job) => Boolean(job.is_verified)).length,
        cls: 'text-green-700 bg-green-500/10 border-green-500/20',
      },
      {
        label: 'Open Jobs',
        value: stats?.jobs?.open ?? jobs.filter((job) => job.status === 'open').length,
        cls: 'text-text-muted bg-[#FAF8F3] border-[#E8E3D8]',
      },
    ];
  });

  /** Application pipeline counters (zero until the stats request resolves). */
  readonly applicationRows = computed<OverviewRow[]>(() => {
    const applications = this.stats()?.applications;
    return [
      { label: 'Applied', value: applications?.applied ?? 0, cls: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' },
      { label: 'Shortlisted', value: applications?.shortlisted ?? 0, cls: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
      { label: 'Rejected', value: applications?.rejected ?? 0, cls: 'bg-red-500/10 text-red-700 border-red-500/20' },
      { label: 'Hired', value: applications?.hired ?? 0, cls: 'bg-green-500/10 text-green-700 border-green-500/20' },
    ];
  });

  /** First eight unverified jobs, as in the React preview list. */
  readonly pendingPreview = computed(() => this.pendingJobs().slice(0, 8));

  /** Five newest accounts with their role pills precomputed. */
  readonly recentUsers = computed<RecentUserRow[]>(() =>
    this.users()
      .slice(0, 5)
      .map((user) => ({
        email: user.email,
        roleLabel: rolePillLabel(user.role),
        roleClass: roleBadgeClass(user.role),
      })),
  );
}
