import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { AdminUser } from '../../core/models/admin';
import { IconComponent, SkeletonComponent } from '../../shared';
import {
  activityBadgeClass,
  formatDateShort,
  isUserActive,
  roleBadgeClass,
  rolePillLabel,
  userListLabel,
} from './admin-format';

/** Role filter options offered by the select. */
export type AdminRoleFilter = 'all' | 'jobseeker' | 'employer' | 'admin';

/** Placeholder bars shown while the user list loads. */
const SKELETON_ROWS = [1, 2, 3, 4];

/** A user list row with its badges/labels precomputed. */
interface UserRow {
  user: AdminUser;
  label: string;
  roleLabel: string;
  roleClass: string;
  active: boolean;
  statusClass: string;
  created: string;
}

/**
 * `users` tab of the admin dashboard: search/role filters plus the per-user
 * status and delete actions (ports the React `AdminUsersTab`).
 *
 * Pure presentation — the page owns the data and performs the requests; this
 * component only emits the user that was acted on.
 */
@Component({
  selector: 'app-admin-users-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SkeletonComponent, NgClass],
  template: `
    <div class="glass-card p-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
        <h2 class="text-lg font-display font-bold text-[#1F2A24] flex items-center gap-2">
          <app-icon class="text-brand-accent" name="users" [size]="20" /> User Management
        </h2>
        <div
          class="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(12rem,0.8fr)]"
        >
          <div class="space-y-1 min-w-0">
            <label
              for="admin-user-search"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Search
            </label>
            <div class="relative">
              <app-icon
                class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                name="search"
                [size]="16"
              />
              <input
                #userSearchEl
                id="admin-user-search"
                type="search"
                class="input-field input-field-with-icon h-12 w-full min-w-0"
                placeholder="ID, email, company, website, or name"
                [value]="userSearchQuery()"
                (input)="searchChange.emit(userSearchEl.value)"
              />
            </div>
          </div>
          <div class="space-y-1 min-w-0">
            <label
              for="admin-user-role"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Role
            </label>
            <select
              #roleEl
              id="admin-user-role"
              class="input-field h-12 w-full min-w-0"
              [value]="roleFilter()"
              (change)="roleChange.emit(roleEl.value)"
            >
              <option value="all">All Roles</option>
              <option value="jobseeker">Seekers</option>
              <option value="employer">Employers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (row of skeletonRows; track row) {
            <app-skeleton variant="row" />
          }
        </div>
      } @else if (rows().length === 0) {
        <p class="text-sm text-text-muted text-center py-10">No users found.</p>
      } @else {
        <div class="space-y-4 max-h-[62vh] overflow-y-auto pr-2">
          @for (row of rows(); track row.user.user_id) {
            <article
              class="rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] p-5 transition-all hover:border-brand-accent/30"
            >
              <div class="flex items-start justify-between gap-4 flex-wrap">
                <button
                  type="button"
                  class="flex-1 min-w-0 space-y-2 text-left cursor-pointer"
                  [attr.aria-label]="'Open details for user ' + row.user.user_id"
                  (click)="openUser.emit(row.user.user_id)"
                >
                  <span class="flex items-center gap-3 flex-wrap">
                    <span class="text-[#1F2A24] font-semibold">
                      #{{ row.user.user_id }} · {{ row.label }}
                    </span>
                    <span
                      class="text-xs px-2 py-1 rounded-full border font-bold capitalize"
                      [ngClass]="row.roleClass"
                    >
                      {{ row.roleLabel }}
                    </span>
                    <span
                      class="text-xs px-2 py-1 rounded-full border font-bold"
                      [ngClass]="row.statusClass"
                    >
                      {{ row.active ? 'Active' : 'Inactive' }}
                    </span>
                  </span>
                  <span class="block text-sm text-text-muted">{{ row.user.email }}</span>
                  @if (row.user.role === 'employer' && row.user.company_website) {
                    <span class="block text-xs text-brand-accent break-all">
                      {{ row.user.company_website }}
                    </span>
                  }
                  <span class="block text-xs text-text-muted">Created {{ row.created }}</span>
                </button>

                <div class="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center min-w-36 px-4 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-700 text-sm font-bold hover:bg-yellow-500/15 transition-all disabled:opacity-60"
                    [disabled]="isStatusBusy(row.user) || isDeleteBusy(row.user)"
                    (click)="toggleStatus.emit(row.user)"
                  >
                    <app-icon name="user" [size]="16" class="mr-2" />
                    {{ isStatusBusy(row.user) ? 'Updating...' : row.active ? 'Deactivate' : 'Activate' }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center min-w-28 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 text-sm font-bold hover:bg-red-500/15 transition-all disabled:opacity-60"
                    [disabled]="isStatusBusy(row.user) || isDeleteBusy(row.user)"
                    (click)="deleteUser.emit(row.user)"
                  >
                    <app-icon name="trash" [size]="16" class="mr-2" />
                    {{ isDeleteBusy(row.user) ? 'Deleting...' : 'Delete' }}
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class AdminUsersTabComponent {
  /** True while the dashboard data is still loading. */
  readonly loading = input(false);

  /** Users after the page's search + role filtering. */
  readonly filteredUsers = input<AdminUser[]>([]);

  /** Current search text (controlled input). */
  readonly userSearchQuery = input('');

  /** Selected role filter. */
  readonly roleFilter = input<AdminRoleFilter>('all');

  /** Key of the in-flight row action (`user-status-<id>` / `user-delete-<id>`). */
  readonly actionKey = input<string | null>(null);

  /** Emits the new search text on every keystroke. */
  readonly searchChange = output<string>();

  /** Emits the newly selected role filter (raw select value). */
  readonly roleChange = output<string>();

  /** Emits when a row is opened (keyboard or mouse). */
  readonly openUser = output<number>();

  /** Emits when the activate/deactivate button is pressed. */
  readonly toggleStatus = output<AdminUser>();

  /** Emits when the delete button is pressed (page shows the confirm). */
  readonly deleteUser = output<AdminUser>();

  /** Placeholder bars rendered while loading. */
  readonly skeletonRows = SKELETON_ROWS;

  /** Rows with badges/labels precomputed for the template. */
  readonly rows = computed<UserRow[]>(() =>
    this.filteredUsers().map((user) => {
      const active = isUserActive(user);
      return {
        user,
        label: userListLabel(user),
        roleLabel: rolePillLabel(user.role),
        roleClass: roleBadgeClass(user.role),
        active,
        statusClass: activityBadgeClass(active),
        created: formatDateShort(user.created_at),
      };
    }),
  );

  /** True while this row's status toggle request is in flight. */
  isStatusBusy(user: AdminUser): boolean {
    return this.actionKey() === `user-status-${user.user_id}`;
  }

  /** True while this row's delete request is in flight. */
  isDeleteBusy(user: AdminUser): boolean {
    return this.actionKey() === `user-delete-${user.user_id}`;
  }
}
