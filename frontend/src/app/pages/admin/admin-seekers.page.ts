import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../core/admin/admin.service';
import { AdminSeeker } from '../../core/models/admin';
import { ToastService } from '../../core/toast/toast.service';
import { CommonModule } from '@angular/common';
import { PageContainerComponent, IconComponent, SkeletonComponent } from '../../shared';
import { formatDateShort } from './admin-format';

const SKELETON_ROWS = [1, 2, 3, 4];

interface SeekerRow {
  seeker: AdminSeeker;
  label: string;
  active: boolean;
  statusClass: string;
  created: string;
  totalApplications: number;
}

/**
 * `/admin/seekers`: job seeker directory with application counts.
 *
 * Mirrors the backend's `GET /api/admin/seekers` response.
 */
@Component({
  selector: 'app-admin-seekers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PageContainerComponent, IconComponent, SkeletonComponent],
  template: `
    <app-page-container>
      <header class="page-enter">
        <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-3">
          <app-icon name="user" [size]="32" class="text-text-muted" /> Job Seeker Directory
        </h1>
        <p class="text-text-muted mt-1">All registered job seekers with their application counts.</p>
      </header>

      <div class="space-y-1 mb-6">
        <label for="admin-seeker-search" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Search
        </label>
        <div class="relative">
          <app-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" name="search" [size]="16" />
          <input
            #searchEl
            id="admin-seeker-search"
            type="search"
            class="input-field input-field-with-icon h-12 w-full max-w-md"
            placeholder="Name, email, education, or phone"
            [value]="searchQuery()"
            (input)="searchQuery.set(searchEl.value)"
          />
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (row of skeletonRows; track row) {
            <app-skeleton variant="row" />
          }
        </div>
      } @else if (filteredSeekers().length === 0) {
        <p class="text-sm text-text-muted text-center py-10">No seekers found.</p>
      } @else {
        <div class="space-y-4 max-h-[62vh] overflow-y-auto pr-2">
          @for (row of rows(); track row.seeker.user_id) {
            <article class="rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] p-5 transition-all hover:border-brand-accent/30">
              <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="flex-1 min-w-0 space-y-2">
                  <span class="flex items-center gap-3 flex-wrap">
                    <span class="text-[#1F2A24] font-semibold">
                      #{{ row.seeker.user_id }} · {{ row.seeker.full_name ?? 'Unnamed Seeker' }}
                    </span>
                    <span
                      class="text-xs px-2 py-1 rounded-full border font-bold"
                      [ngClass]="row.statusClass"
                    >
                      {{ row.active ? 'Active' : 'Inactive' }}
                    </span>
                  </span>
                  <span class="block text-sm text-text-muted">{{ row.seeker.email }}</span>
                  @if (row.seeker.phone_number) {
                    <span class="block text-xs text-text-muted">Phone: {{ row.seeker.phone_number }}</span>
                  }
                  @if (row.seeker.education) {
                    <span class="block text-xs text-text-muted">Education: {{ row.seeker.education }}</span>
                  }
                  <span class="block text-xs text-text-muted">
                    {{ row.totalApplications }} application{{ row.totalApplications === 1 ? '' : 's' }} · Created {{ row.created }}
                  </span>
                  @if (row.seeker.experience_years !== undefined && row.seeker.experience_years !== null) {
                    <span class="block text-xs text-text-muted">Experience: {{ row.seeker.experience_years }} year{{ row.seeker.experience_years === 1 ? '' : 's' }}</span>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
    </app-page-container>
  `,
})
export class AdminSeekersPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly searchQuery = signal('');

  readonly seekers = signal<AdminSeeker[]>([]);
  readonly skeletonRows = SKELETON_ROWS;

  readonly filteredSeekers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.seekers();
    return this.seekers().filter((seeker) => {
      const searchable = [
        String(seeker.user_id),
        seeker.email,
        seeker.full_name ?? '',
        seeker.phone_number ?? '',
        seeker.education ?? '',
      ];
      return searchable
        .filter((part): part is string => Boolean(part))
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  readonly rows = computed<SeekerRow[]>(() =>
    this.filteredSeekers().map((seeker) => {
      const active = Boolean(Number(seeker.is_active));
      return {
        seeker,
        label: seeker.full_name ?? 'Unnamed Seeker',
        active,
        statusClass: active
          ? 'text-green-700 bg-green-500/10 border-green-500/20'
          : 'text-red-700 bg-red-500/10 border-red-500/20',
        created: formatDateShort(seeker.created_at),
        totalApplications: seeker.total_applications ?? 0,
      };
    }),
  );

  constructor() {
    this.loadSeekers();
  }

  private loadSeekers(): void {
    this.admin
      .seekers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (seekers) => {
          this.seekers.set(seekers);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load seekers'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}