import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AdminService } from '../../core/admin/admin.service';
import { AdminUser } from '../../core/models/admin';
import { ToastService } from '../../core/toast/toast.service';
import { PageContainerComponent, IconComponent } from '../../shared';
import { AdminUsersTabComponent, AdminRoleFilter } from './admin-users-tab.component';
import { AdminUserDetailPage } from './admin-user-detail.page';

/**
 * `/admin/users`: dedicated user management page.
 *
 * Mirrors the `users` tab of the dashboard but stands alone with its own
 * data loading and action handling. Uses the same presentation component.
 */
@Component({
  selector: 'app-admin-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminUsersTabComponent, PageContainerComponent, IconComponent],
  template: `
    <app-page-container>
      <header class="page-enter">
        <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-3">
          <app-icon name="users" [size]="32" class="text-text-muted" /> User Management
        </h1>
        <p class="text-text-muted mt-1">Browse, activate/deactivate, and delete accounts.</p>
      </header>

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
    </app-page-container>
  `,
})
export class AdminUsersPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);

  readonly users = signal<AdminUser[]>([]);

  readonly userSearchQuery = signal('');
  readonly roleFilter = signal<AdminRoleFilter>('all');

  readonly actionKey = signal<string | null>(null);

  readonly filteredUsers = computed(() => {
    const query = this.userSearchQuery().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users().filter((user) => {
      if (role !== 'all' && user.role !== role) return false;
      if (!query) return true;
      const searchable = [String(user.user_id), user.email, user.full_name, user.company_name];
      return searchable
        .filter((part): part is string => Boolean(part))
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  constructor() {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.admin
      .users()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load users'));
        },
      });
  }

  onRoleFilterChange(value: string): void {
    this.roleFilter.set(
      value === 'jobseeker' || value === 'employer' || value === 'admin' ? value : 'all',
    );
  }

  openUser(userId: number): void {
    this.router.navigate(['/admin/users', userId]);
  }

  onToggleUserStatus(user: AdminUser): void {
    const nextActive = !Boolean(user.is_active);
    this.actionKey.set(`user-status-${user.user_id}`);
    this.admin
      .setUserActive(user.user_id, nextActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(nextActive ? 'User activated' : 'User deactivated');
          this.loadUsers();
          this.actionKey.set(null);
        },
        error: (error: unknown) => {
          this.actionKey.set(null);
          this.toast.error(this.message(error, 'Failed to update user status'));
        },
      });
  }

  onDeleteUser(user: AdminUser): void {
    if (!window.confirm(`Delete user #${user.user_id}? This cannot be undone.`)) return;

    this.actionKey.set(`user-delete-${user.user_id}`);
    this.admin
      .deleteUser(user.user_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('User deleted');
          this.loadUsers();
          this.actionKey.set(null);
        },
        error: (error: unknown) => {
          this.actionKey.set(null);
          this.toast.error(this.message(error, 'Failed to delete user'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}