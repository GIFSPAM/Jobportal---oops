import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { AdminService } from '../../core/admin/admin.service';
import { AdminJob, AdminLog, AdminStats, AdminUser } from '../../core/models/admin';
import { ToastService } from '../../core/toast/toast.service';
import { IconComponent, IconName, PageContainerComponent, StatCardComponent } from '../../shared';
import { AdminJobsTabComponent, AdminVerificationFilter } from './admin-jobs-tab.component';
import { AdminLogsTabComponent } from './admin-logs-tab.component';
import { AdminOverviewTabComponent } from './admin-overview-tab.component';
import { AdminRoleFilter, AdminUsersTabComponent } from './admin-users-tab.component';

/** Sections reachable through `?tab=` — also the tab button order. */
const TABS = ['overview', 'users', 'jobs', 'logs'] as const;

/** Sentinel value meaning "no filter". */
const ALL = 'all';

/** One KPI tile's data (mirrors the React `statCards` array). */
interface StatCardData {
  label: string;
  value: number;
  icon: IconName;
  colorClass: string;
}

/** Everything the dashboard loads in one go. */
interface AdminDataset {
  stats: AdminStats;
  jobs: AdminJob[];
  users: AdminUser[];
  logs: AdminLog[];
}

/** Options for a dashboard (re)load. */
interface LoadOptions {
  /** Keeps the skeleton hidden (used for post-action refreshes). */
  silent?: boolean;
  /** Restores the scroll position once the data lands. */
  preserveScroll?: boolean;
  /** Runs after the request settles, whatever the outcome. */
  onComplete?: () => void;
}

/**
 * `/admin/dashboard`: the tabbed admin console (overview/users/jobs/logs).
 *
 * The active tab is driven by the `?tab=` query param, so links like
 * `/admin/dashboard?tab=users` land on the right section — mirroring the React
 * `useSearchParams` usage. All state lives here as signals; the four tab
 * components are pure presentation that emit the row acted on.
 */
@Component({
  selector: 'app-admin-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageContainerComponent,
    StatCardComponent,
    IconComponent,
    AdminOverviewTabComponent,
    AdminUsersTabComponent,
    AdminJobsTabComponent,
    AdminLogsTabComponent,
  ],
  template: `
    <app-page-container>
      <header class="page-enter">
        <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-3">
          <app-icon name="shield-check" [size]="32" class="text-text-muted" /> Admin Panel
        </h1>
        <p class="text-text-muted mt-1">Manage jobs, users, and platform data.</p>
      </header>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        @for (card of statCards(); track card.label; let index = $index) {
          <app-stat-card
            [label]="card.label"
            [value]="card.value"
            [icon]="card.icon"
            [colorClass]="card.colorClass"
            [loading]="loading()"
            [index]="index"
          />
        }
      </div>

      <div
        role="tablist"
        aria-label="Admin dashboard sections"
        class="flex flex-wrap items-center gap-3"
      >
        @for (tab of tabs; track tab) {
          <button
            type="button"
            role="tab"
            [id]="'admin-tab-' + tab"
            [attr.aria-controls]="'admin-tabpanel-' + tab"
            [attr.aria-selected]="activeTab() === tab"
            [class]="tabClass(tab)"
            (click)="selectTab(tab)"
          >
            {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
          </button>
        }
      </div>

      @switch (activeTab()) {
        @case ('overview') {
          <div
            role="tabpanel"
            id="admin-tabpanel-overview"
            aria-labelledby="admin-tab-overview"
          >
            <app-admin-overview-tab
              [loading]="loading()"
              [stats]="stats()"
              [users]="users()"
              [jobs]="jobs()"
              [pendingJobs]="pendingJobs()"
            />
          </div>
        }
        @case ('users') {
          <div role="tabpanel" id="admin-tabpanel-users" aria-labelledby="admin-tab-users">
            <app-admin-users-tab
              [loading]="loading()"
              [filteredUsers]="filteredUsers()"
              [userSearchQuery]="userSearchQuery()"
              [roleFilter]="roleFilter()"
              [actionKey]="actionKey()"
              (searchChange)="userSearchQuery.set($event)"
              (roleChange)="onRoleFilterChange($event)"
              (openUser)="openUser($event)"
              (toggleStatus)="onToggleUserStatus($event)"
              (deleteUser)="onDeleteUser($event)"
            />
          </div>
        }
        @case ('jobs') {
          <div role="tabpanel" id="admin-tabpanel-jobs" aria-labelledby="admin-tab-jobs">
            <app-admin-jobs-tab
              [loading]="loading()"
              [jobs]="jobs()"
              [pendingJobsCount]="pendingJobs().length"
              [filteredJobs]="filteredJobs()"
              [jobIdSearchQuery]="jobIdSearchQuery()"
              [jobTitleSearchQuery]="jobTitleSearchQuery()"
              [jobLocationFilter]="jobLocationFilter()"
              [availableJobLocations]="availableJobLocations()"
              [jobTypeFilter]="jobTypeFilter()"
              [availableJobTypes]="availableJobTypes()"
              [jobVerificationFilter]="jobVerificationFilter()"
              [actionKey]="actionKey()"
              (jobIdSearchChange)="jobIdSearchQuery.set($event)"
              (jobTitleSearchChange)="jobTitleSearchQuery.set($event)"
              (jobLocationFilterChange)="jobLocationFilter.set($event)"
              (jobTypeFilterChange)="jobTypeFilter.set($event)"
              (jobVerificationFilterChange)="onVerificationFilterChange($event)"
              (openJob)="openJob($event)"
              (toggleVerification)="onToggleJobVerification($event)"
              (deleteJob)="onDeleteJob($event)"
            />
          </div>
        }
        @case ('logs') {
          <div role="tabpanel" id="admin-tabpanel-logs" aria-labelledby="admin-tab-logs">
            <app-admin-logs-tab
              [loading]="loading()"
              [logs]="logs()"
              [filteredLogs]="filteredLogs()"
              [logSearchQuery]="logSearchQuery()"
              [logTableFilter]="logTableFilter()"
              [availableLogTypes]="availableLogTypes()"
              (searchChange)="logSearchQuery.set($event)"
              (tableFilterChange)="logTableFilter.set($event)"
            />
          </div>
        }
      }
    </app-page-container>
  `,
})
export class AdminDashboardPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Tab buttons, in display order. */
  readonly tabs = TABS;

  /** Live `?tab=` value — the route owns it, so links land on the right tab. */
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** Currently selected section (`overview` when the param is absent). */
  readonly activeTab = computed(() => this.queryParamMap().get('tab') ?? 'overview');

  /** Platform counters, `null` until the stats request resolves. */
  readonly stats = signal<AdminStats | null>(null);

  /** Every job, unfiltered (the jobs tab filters client-side, as in React). */
  readonly jobs = signal<AdminJob[]>([]);

  /** Every account, unfiltered. */
  readonly users = signal<AdminUser[]>([]);

  /** Audit log entries, newest first. */
  readonly logs = signal<AdminLog[]>([]);

  /** True until the four dashboard requests settle. */
  readonly loading = signal(true);

  /** Key of the in-flight row action, e.g. `user-status-42`. */
  readonly actionKey = signal<string | null>(null);

  /** Filter state for the users tab. */
  readonly userSearchQuery = signal('');
  readonly roleFilter = signal<AdminRoleFilter>('all');

  /** Filter state for the jobs tab. */
  readonly jobIdSearchQuery = signal('');
  readonly jobTitleSearchQuery = signal('');
  readonly jobLocationFilter = signal(ALL);
  readonly jobTypeFilter = signal(ALL);
  readonly jobVerificationFilter = signal<AdminVerificationFilter>('all');

  /** Filter state for the logs tab. */
  readonly logSearchQuery = signal('');
  readonly logTableFilter = signal(ALL);

  /** Jobs still awaiting verification (drives two counters/cards). */
  readonly pendingJobs = computed(() =>
    this.jobs().filter((job) => !Boolean(job.is_verified)),
  );

  /** KPI tiles with the same list-based fallbacks as the React dashboard. */
  readonly statCards = computed<StatCardData[]>(() => {
    const stats = this.stats();
    const users = this.users();
    const jobs = this.jobs();
    return [
      {
        label: 'Total Users',
        value: stats?.users?.total ?? users.filter((user) => user.role !== 'admin').length,
        icon: 'users',
        colorClass: 'text-brand-accent bg-brand-accent/10',
      },
      {
        label: 'Total Jobs',
        value: stats?.jobs?.total ?? jobs.length,
        icon: 'briefcase',
        colorClass: 'text-yellow-700 bg-yellow-500/10',
      },
      {
        label: 'Pending Review',
        value: this.pendingJobs().length,
        icon: 'x-circle',
        colorClass: 'text-red-700 bg-red-500/10',
      },
      {
        label: 'Applications',
        value: stats?.applications?.total ?? 0,
        icon: 'activity',
        colorClass: 'text-text-muted bg-[#FAF8F3]',
      },
      {
        label: 'Logs',
        value: this.logs().length,
        icon: 'shield-check',
        colorClass: 'text-brand-accent bg-brand-accent/10',
      },
    ];
  });

  /** Users matching the search text and role filter. */
  readonly filteredUsers = computed(() => {
    const query = this.userSearchQuery().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter((user) => {
      if (role !== 'all' && user.role !== role) return false;
      if (!query) return true;
      const searchable = [String(user.user_id), user.email, user.full_name, user.company_name, user.crn];
      return searchable
        .filter((part): part is string => Boolean(part))
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  /** Jobs matching all five jobs-tab filters. */
  readonly filteredJobs = computed(() => {
    const idQuery = this.jobIdSearchQuery().trim();
    const titleQuery = this.jobTitleSearchQuery().trim().toLowerCase();
    const location = this.jobLocationFilter();
    const jobType = this.jobTypeFilter();
    const verification = this.jobVerificationFilter();
    return this.jobs().filter((job) => {
      const matchesId =
        !idQuery ||
        String(job.job_id).includes(idQuery) ||
        (job.crn && job.crn.toLowerCase().includes(idQuery.toLowerCase()));
      const matchesTitle =
        !titleQuery || String(job.title ?? '').toLowerCase().includes(titleQuery);
      const matchesLocation = location === ALL || String(job.location ?? '') === location;
      const matchesJobType = jobType === ALL || String(job.job_type ?? '') === jobType;
      const matchesVerification =
        verification === ALL ||
        (verification === 'verified' ? Boolean(job.is_verified) : !Boolean(job.is_verified));
      return matchesId && matchesTitle && matchesLocation && matchesJobType && matchesVerification;
    });
  });

  /** Entries matching the search text and target-table filter. */
  readonly filteredLogs = computed(() => {
    const query = this.logSearchQuery().trim().toLowerCase();
    const table = this.logTableFilter();
    return this.logs().filter((log) => {
      if (table !== ALL && String(log.target_table ?? '') !== table) return false;
      if (!query) return true;
      const searchable = [
        String(log.log_id),
        String(log.admin_id),
        log.admin_email,
        log.action_type,
        log.target_table,
        String(log.target_id ?? ''),
      ];
      return searchable
        .filter((part): part is string => Boolean(part))
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  /** Distinct locations present in the job list (for the select). */
  readonly availableJobLocations = computed(() =>
    Array.from(
      new Set(
        this.jobs()
          .map((job) => String(job.location ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  );

  /** Distinct job types present in the job list (for the select). */
  readonly availableJobTypes = computed(() =>
    Array.from(
      new Set(
        this.jobs()
          .map((job) => String(job.job_type ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  );

  /** Distinct target tables present in the log list (for the select). */
  readonly availableLogTypes = computed(() =>
    Array.from(
      new Set(
        this.logs()
          .map((log) => String(log.target_table ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right)),
  );

  constructor() {
    this.loadAdminData();
  }

  /** Highlights the selected tab and mutes the others. */
  tabClass(tab: string): string {
    return this.activeTab() === tab
      ? 'bg-brand-accent text-white border-brand-accent'
      : 'bg-[#FAF8F3] text-text-muted border-[#E8E3D8] hover:text-[#1F2A24] hover:border-border-stone';
  }

  /** Switches `?tab=`, which is what selects the visible panel. */
  selectTab(tab: string): void {
    this.router.navigate(['/admin/dashboard'], { queryParams: { tab } });
  }

  /** Opens a user detail page. */
  openUser(userId: number): void {
    this.router.navigate(['/admin/users', userId]);
  }

  /** Opens a job detail page, seeding it with the row to avoid a flash. */
  openJob(job: AdminJob): void {
    this.router.navigate(['/admin/jobs', job.job_id], { state: { job } });
  }

  /** Applies the role filter, mapping unknown select values to "all". */
  onRoleFilterChange(value: string): void {
    this.roleFilter.set(
      value === 'jobseeker' || value === 'employer' || value === 'admin' ? value : 'all',
    );
  }

  /** Applies the verification filter, mapping unknown values to "all". */
  onVerificationFilterChange(value: string): void {
    this.jobVerificationFilter.set(
      value === 'verified' || value === 'unverified' ? value : 'all',
    );
  }

  /** Activates/deactivates a user, then refreshes with the scroll kept. */
  onToggleUserStatus(user: AdminUser): void {
    const nextActive = !Boolean(user.is_active);
    this.actionKey.set(`user-status-${user.user_id}`);
    this.admin
      .setUserActive(user.user_id, nextActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.toast.success(nextActive ? 'User activated' : 'User deactivated');
        this.loadAdminData({
          silent: true,
          preserveScroll: true,
          onComplete: () => this.actionKey.set(null),
        });
      },
      error: (error: unknown) => {
        this.actionKey.set(null);
        this.toast.error(this.message(error, 'Failed to update user status'));
      },
    });
  }

  /** Deletes a user after the React's native confirm, then refreshes. */
  onDeleteUser(user: AdminUser): void {
    if (!window.confirm(`Delete user #${user.user_id}? This cannot be undone.`)) return;

    this.actionKey.set(`user-delete-${user.user_id}`);
    this.admin
      .deleteUser(user.user_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.toast.success('User deleted');
        this.loadAdminData({
          silent: true,
          preserveScroll: true,
          onComplete: () => this.actionKey.set(null),
        });
      },
      error: (error: unknown) => {
        this.actionKey.set(null);
        this.toast.error(this.message(error, 'Failed to delete user'));
      },
    });
  }

  /** Deletes a job after confirmation, then refreshes. */
  onDeleteJob(job: AdminJob): void {
    if (!window.confirm(`Delete job #${job.job_id}? This cannot be undone.`)) return;

    this.actionKey.set(`job-delete-${job.job_id}`);
    this.admin
      .deleteJob(job.job_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.toast.success('Job deleted');
        this.loadAdminData({
          silent: true,
          preserveScroll: true,
          onComplete: () => this.actionKey.set(null),
        });
      },
      error: (error: unknown) => {
        this.actionKey.set(null);
        this.toast.error(this.message(error, 'Failed to delete job'));
      },
    });
  }

  /** Flips a job's verification flag and refreshes the moderation lists. */
  onToggleJobVerification(job: AdminJob): void {
    const nextVerified = !Boolean(job.is_verified);
    this.actionKey.set(`job-verify-toggle-${job.job_id}`);

    const request = nextVerified ? this.admin.verifyJob(job.job_id) : this.admin.unverifyJob(job.job_id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(nextVerified ? 'Job verified' : 'Job unverified');
        this.loadAdminData({
          silent: true,
          preserveScroll: true,
          onComplete: () => this.actionKey.set(null),
        });
      },
      error: (error: unknown) => {
        this.actionKey.set(null);
        this.toast.error(this.message(error, 'Failed to update verification'));
      },
    });
  }

  /** Loads stats/jobs/users/logs together; `silent` keeps skeletons hidden. */
  private loadAdminData(options: LoadOptions = {}): void {
    const previousScrollY = window.scrollY;
    if (!options.silent) {
      this.loading.set(true);
    }

    this.dataset$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.stats.set(data.stats);
          this.jobs.set(data.jobs);
          this.users.set(data.users);
          this.logs.set(data.logs);
          this.loading.set(false);
          if (options.preserveScroll) {
            requestAnimationFrame(() => window.scrollTo({ top: previousScrollY }));
          }
          options.onComplete?.();
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load admin data'));
          options.onComplete?.();
        },
      });
  }

  /** The four dashboard requests, joined so they resolve or fail together. */
  private dataset$(): Observable<AdminDataset> {
    return forkJoin({
      stats: this.admin.stats(),
      jobs: this.admin.jobs(),
      users: this.admin.users(),
      logs: this.admin.logs(),
    });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
