import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/admin/admin.service';
import { AdminJob, AdminUser } from '../../core/models/admin';
import { ToastService } from '../../core/toast/toast.service';
import {
  DetailFieldCardComponent,
  IconComponent,
  PageContainerComponent,
  SkeletonComponent,
  StatusBadgeComponent,
} from '../../shared';
import {
  activityBadgeClass,
  formatDateShort,
  formatDateTime,
  formatSalaryRange,
  isUserActive,
  roleBadgeClass,
  roleLabel,
  userAvatarFallback,
  userAvatarSrc,
  userDisplayName,
} from './admin-format';

/** One labelled field in the details grid. */
interface DetailRow {
  label: string;
  value: string | number;
}

/** Placeholder bars shown while the account loads. */
const SKELETON_ROWS = [1, 2, 3, 4, 5];

/**
 * `/admin/users/:userId`: account summary plus moderation actions.
 *
 * Ports the React `AdminUserDetail` — status toggle updates the local signal
 * (no refetch), while delete confirms first and then bounces back to the
 * dashboard's users tab.
 */
@Component({
  selector: 'app-admin-user-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageContainerComponent,
    DetailFieldCardComponent,
    IconComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    NgClass,
  ],
  template: `
    <app-page-container maxWidthClass="max-w-5xl" contentClassName="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap page-enter">
        <div>
          <button
            type="button"
            class="mb-4 text-sm text-text-muted hover:text-[#1F2A24] transition-colors inline-flex items-center gap-2"
            (click)="backToUsers()"
          >
            <app-icon name="arrow-left" [size]="16" /> Back to Users
          </button>
          <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-2">
            <app-icon class="text-brand-accent" name="user" [size]="28" /> User Detail
          </h1>
          <p class="text-text-muted mt-1">
            Review complete account info and moderate status.
          </p>
        </div>

        @if (user(); as currentUser) {
          <div class="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              class="inline-flex items-center justify-center min-w-36 px-4 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-700 text-sm font-bold hover:bg-yellow-500/15 transition-all disabled:opacity-60"
              [disabled]="actionKey() !== null"
              (click)="onToggleStatus()"
            >
              <app-icon name="user" [size]="16" class="mr-2" />
              {{ actionKey() === 'status' ? 'Updating...' : isUserActive(currentUser) ? 'Deactivate' : 'Activate' }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center min-w-28 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 text-sm font-bold hover:bg-red-500/15 transition-all disabled:opacity-60"
              [disabled]="actionKey() !== null"
              (click)="onDelete()"
            >
              <app-icon name="trash" [size]="16" class="mr-2" />
              {{ actionKey() === 'delete' ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="glass-card p-8 space-y-3">
          @for (row of skeletonRows; track row) {
            <app-skeleton variant="row" />
          }
        </div>
      } @else if (user(); as currentUser) {
          <div class="glass-card p-6 flex items-start justify-between gap-4 flex-wrap">
            <div class="flex items-start gap-4">
              <div
                class="w-16 h-16 rounded-2xl border border-[#E8E3D8] bg-[#FAF8F3] text-brand-accent font-bold text-lg flex items-center justify-center overflow-hidden shrink-0"
              >
                @if (avatarSrc(); as src) {
                  <img
                    [src]="src"
                    [alt]="displayName(currentUser) + ' avatar'"
                    class="w-full h-full object-cover"
                    referrerpolicy="no-referrer"
                  />
                } @else {
                  {{ avatarFallback(currentUser) }}
                }
              </div>
              <div>
                <h2 class="text-2xl font-display font-bold text-[#1F2A24]">
                  #{{ currentUser.user_id }} · {{ displayName(currentUser) }}
                </h2>
                <p class="text-text-muted mt-1 inline-flex items-center gap-2">
                  <app-icon name="mail" [size]="16" /> {{ currentUser.email }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="text-xs px-2.5 py-1 rounded-full border font-bold"
                [ngClass]="roleBadgeClass(currentUser.role)"
              >
                {{ roleLabel(currentUser.role) }}
              </span>
              <span
                class="text-xs px-2.5 py-1 rounded-full border font-bold"
                [ngClass]="activityBadgeClass(isUserActive(currentUser))"
              >
                {{ isUserActive(currentUser) ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (row of detailRows(); track row.label) {
              <app-detail-field-card [label]="row.label" [value]="row.value" />
            }
          </div>

          <div class="glass-card p-6">
            <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-3">
              Quick Snapshot
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 text-sm text-text-muted inline-flex items-center gap-2"
              >
                <app-icon class="text-brand-accent" name="shield-check" [size]="16" />
                Moderation enabled
              </div>
              <div
                class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 text-sm text-text-muted inline-flex items-center gap-2"
              >
                <app-icon class="text-yellow-700" name="calendar" [size]="16" />
                Created {{ formatDateShort(currentUser.created_at) }}
              </div>
              <div
                class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 text-sm text-text-muted inline-flex items-center gap-2"
              >
                @if (currentUser.role === 'jobseeker') {
                  <app-icon class="text-brand-accent" name="graduation-cap" [size]="16" />
                } @else if (currentUser.role === 'employer') {
                  <app-icon class="text-yellow-700" name="building" [size]="16" />
                } @else {
                  <app-icon name="user" [size]="16" />
                }
                {{ roleLabel(currentUser.role) }} account
              </div>
            </div>
          </div>

          @if (currentUser.role === 'employer') {
            <div class="glass-card p-6">
              <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-3">
                Company Contact
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-text-muted">
                <div
                  class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 inline-flex items-center gap-2"
                >
                  <app-icon class="text-brand-accent" name="phone" [size]="16" />
                  {{ currentUser.company_phone ?? 'No phone' }}
                </div>
                <div
                  class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 inline-flex items-center gap-2"
                >
                  <app-icon class="text-yellow-700" name="map-pin" [size]="16" />
                  {{ currentUser.company_location ?? 'No location' }}
                </div>
                <div
                  class="rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-3 inline-flex items-center gap-2 break-all"
                >
                  <app-icon name="globe" [size]="16" />
                  {{ currentUser.company_website ?? 'No website' }}
                </div>
              </div>
            </div>

            <div class="glass-card p-6">
              <h3 class="text-sm uppercase tracking-widest text-text-muted font-bold mb-4">
                Jobs Posted By Employer
              </h3>

              @if (employerPostedJobs().length === 0) {
                <p class="text-sm text-text-muted">No jobs posted by this employer yet.</p>
              } @else {
                <div class="space-y-3 max-h-[38vh] overflow-y-auto pr-2">
                  @for (job of employerPostedJobs(); track job.job_id) {
                    <button
                      type="button"
                      class="w-full text-left rounded-xl border border-[#EFE9DD] bg-[#FAF8F3] p-4 hover:border-brand-accent/30 transition-all"
                      (click)="openJob(job.job_id)"
                    >
                      <div class="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p class="text-[#1F2A24] font-semibold inline-flex items-center gap-2">
                            <app-icon class="text-brand-accent" name="briefcase" [size]="16" />
                            {{ job.title }}
                          </p>
                          <p class="text-xs text-text-muted mt-1">
                            #{{ job.job_id }} · {{ job.location || 'Remote' }} ·
                            {{ formatSalaryRange(job.salary_min, job.salary_max) }}
                          </p>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <app-status-badge variant="job" [value]="job.status ?? ''" />
                          <app-status-badge
                            variant="verification"
                            [value]="verificationValue(job)"
                          />
                        </div>
                      </div>
                      <p class="text-[11px] text-text-muted mt-2">
                        Posted {{ formatDateShort(job.posted_at) }}
                      </p>
                    </button>
                  }
                </div>
              }
            </div>
          }
      } @else {
        <div class="glass-card p-8 text-center">
          <p class="text-text-muted">User not found or unavailable.</p>
        </div>
      }
    </app-page-container>
  `,
})
export class AdminUserDetailPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** The loaded account, `null` before the request resolves or on failure. */
  readonly user = signal<AdminUser | null>(null);

  /** Jobs posted by this account when it is an employer. */
  readonly employerPostedJobs = signal<AdminJob[]>([]);

  /** True until the user (and, for employers, their jobs) have loaded. */
  readonly loading = signal(true);

  /** Which destructive action is in flight (`status` / `delete`), if any. */
  readonly actionKey = signal<string | null>(null);

  /** Placeholder bars rendered while loading. */
  readonly skeletonRows = SKELETON_ROWS;

  /** Avatar URL, `''` when the account carries no picture. */
  readonly avatarSrc = computed(() => userAvatarSrc(this.user()));

  /** Role-specific label for the header and snapshot card. */
  readonly roleLabel = roleLabel;
  readonly roleBadgeClass = roleBadgeClass;
  readonly activityBadgeClass = activityBadgeClass;
  readonly isUserActive = isUserActive;
  readonly formatDateShort = formatDateShort;
  readonly formatSalaryRange = formatSalaryRange;

  private readonly userId = Number(this.route.snapshot.paramMap.get('userId'));

  /** True when the route carries a usable numeric id. */
  private readonly validUserId =
    Number.isInteger(this.userId) && this.userId > 0;

  /** Base fields plus the role-specific ones, mirroring the React memo. */
  readonly detailRows = computed<DetailRow[]>(() => {
    const user = this.user();
    if (!user) return [];

    const base: DetailRow[] = [
      { label: 'User ID', value: user.user_id ?? 'Unknown' },
      { label: 'Email', value: user.email ?? 'Not added' },
      { label: 'Role', value: roleLabel(user.role) },
      { label: 'Created', value: formatDateTime(user.created_at) },
    ];

    if (user.role === 'jobseeker') {
      return [
        ...base,
        { label: 'Full Name', value: user.full_name ?? 'Not added' },
        { label: 'Phone', value: user.phone_number ?? 'Not added' },
        { label: 'Education', value: user.education ?? 'Not added' },
        { label: 'Experience', value: `${Number(user.experience_years ?? 0)} years` },
      ];
    }

    if (user.role === 'employer') {
      return [
        ...base,
        { label: 'Company Name', value: user.company_name ?? 'Not added' },
        { label: 'CRN No (Registration No)', value: user.crn ?? 'Not added' },
        { label: 'Industry', value: user.industry ?? 'Not added' },
        { label: 'Company Size', value: user.company_size ?? 'Not added' },
        { label: 'Location', value: user.company_location ?? 'Not added' },
        { label: 'Phone', value: user.company_phone ?? 'Not added' },
        { label: 'Website', value: user.company_website ?? 'Not added' },
      ];
    }

    return base;
  });

  constructor() {
    if (!this.validUserId) {
      this.toast.error('Invalid user ID');
      this.router.navigate(['/admin/dashboard'], {
        queryParams: { tab: 'users' },
        replaceUrl: true,
      });
      return;
    }
    this.loadUser();
  }

  /** Display name used in the header and avatar fallback. */
  displayName(user: AdminUser): string {
    return userDisplayName(user);
  }

  /** Avatar placeholder letter for accounts without a picture. */
  avatarFallback(user: AdminUser): string {
    return userAvatarFallback(user);
  }

  /** Verification flag formatted for the shared status badge. */
  verificationValue(job: AdminJob): string {
    return job.is_verified === undefined || job.is_verified === null
      ? ''
      : String(job.is_verified);
  }

  /** Returns to the dashboard's users tab. */
  backToUsers(): void {
    this.router.navigate(['/admin/dashboard'], { queryParams: { tab: 'users' } });
  }

  /** Opens one of the employer's job detail pages. */
  openJob(jobId: number): void {
    this.router.navigate(['/admin/jobs', jobId]);
  }

  /** Toggles the account's active flag, updating the view in place. */
  onToggleStatus(): void {
    const user = this.user();
    if (!user) return;

    const nextActive = !isUserActive(user);
    this.actionKey.set('status');
    this.admin
      .setUserActive(this.userId, nextActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.user.set({ ...user, is_active: nextActive });
          this.actionKey.set(null);
          this.toast.success(nextActive ? 'User activated' : 'User deactivated');
        },
        error: (error: unknown) => {
          this.actionKey.set(null);
          this.toast.error(this.message(error, 'Failed to update user status'));
        },
      });
  }

  /** Deletes the account after confirmation and leaves the page. */
  onDelete(): void {
    const user = this.user();
    if (!user) return;
    if (!window.confirm(`Delete user #${user.user_id}? This cannot be undone.`)) return;

    this.actionKey.set('delete');
    this.admin
      .deleteUser(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('User deleted');
          this.router.navigate(['/admin/dashboard'], {
            queryParams: { tab: 'users' },
            replaceUrl: true,
          });
        },
        error: (error: unknown) => {
          this.actionKey.set(null);
          this.toast.error(this.message(error, 'Failed to delete user'));
        },
      });
  }

  /** Loads the account; employers additionally load their posted jobs. */
  private loadUser(): void {
    this.admin
      .user(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.user.set(user);
          if (user.role !== 'employer') {
            this.employerPostedJobs.set([]);
            this.loading.set(false);
            return;
          }
          this.loadEmployerJobs(user.user_id);
        },
        error: (error: unknown) => {
          this.user.set(null);
          this.employerPostedJobs.set([]);
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load user'));
        },
      });
  }

  /** Loads the employer's jobs and stops the skeleton once they settle. */
  private loadEmployerJobs(employerId: number): void {
    this.admin
      .jobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.employerPostedJobs.set(
            jobs.filter((job) => Number(job.employer_id) === Number(employerId)),
          );
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.employerPostedJobs.set([]);
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load employer jobs'));
        },
      });
  }

  /** Extracts a friendly message from an interceptor-mapped error. */
  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
