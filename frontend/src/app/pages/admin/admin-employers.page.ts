import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService } from '../../core/admin/admin.service';
import { AdminEmployer } from '../../core/models/admin';
import { ToastService } from '../../core/toast/toast.service';
import { CommonModule } from '@angular/common';
import { PageContainerComponent, IconComponent, SkeletonComponent } from '../../shared';
import { formatDateShort } from './admin-format';

const SKELETON_ROWS = [1, 2, 3, 4];

interface EmployerRow {
  employer: AdminEmployer;
  label: string;
  active: boolean;
  statusClass: string;
  created: string;
  totalJobs: number;
}

/**
 * `/admin/employers`: company directory with job counts.
 *
 * Mirrors the backend's `GET /api/admin/employers` response.
 */
@Component({
  selector: 'app-admin-employers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PageContainerComponent, IconComponent, SkeletonComponent],
  template: `
    <app-page-container>
      <header class="page-enter">
        <h1 class="text-3xl font-display font-bold text-[#1F2A24] flex items-center gap-3">
          <app-icon name="briefcase" [size]="32" class="text-text-muted" /> Employer Directory
        </h1>
        <p class="text-text-muted mt-1">All registered companies with their job counts.</p>
      </header>

      <div class="space-y-1 mb-6">
        <label for="admin-employer-search" class="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Search
        </label>
        <div class="relative">
          <app-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" name="search" [size]="16" />
          <input
            #searchEl
            id="admin-employer-search"
            type="search"
            class="input-field input-field-with-icon h-12 w-full max-w-md"
            placeholder="Company name, website, email, or location"
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
      } @else if (filteredEmployers().length === 0) {
        <p class="text-sm text-text-muted text-center py-10">No employers found.</p>
      } @else {
        <div class="space-y-4 max-h-[62vh] overflow-y-auto pr-2">
          @for (row of rows(); track row.employer.user_id) {
            <article class="rounded-2xl border border-[#EFE9DD] bg-[#FAF8F3] p-5 transition-all hover:border-brand-accent/30">
              <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="flex-1 min-w-0 space-y-2">
                  <span class="flex items-center gap-3 flex-wrap">
                    <span class="text-[#1F2A24] font-semibold">
                      #{{ row.employer.user_id }} · {{ row.employer.company_name ?? 'Unnamed Company' }}
                    </span>
                    <span
                      class="text-xs px-2 py-1 rounded-full border font-bold"
                      [ngClass]="row.statusClass"
                    >
                      {{ row.active ? 'Active' : 'Inactive' }}
                    </span>
                  </span>
                  <span class="block text-sm text-text-muted">{{ row.employer.email }}</span>
                  @if (row.employer.company_website) {
                    <span class="block text-xs text-brand-accent break-all">
                      {{ row.employer.company_website }}
                    </span>
                  }
                  <span class="block text-xs text-text-muted">
                    {{ row.totalJobs }} job{{ row.totalJobs === 1 ? '' : 's' }} · Created {{ row.created }}
                  </span>
                  @if (row.employer.company_location) {
                    <span class="block text-xs text-text-muted">Location: {{ row.employer.company_location }}</span>
                  }
                  @if (row.employer.industry) {
                    <span class="block text-xs text-text-muted">Industry: {{ row.employer.industry }}</span>
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
export class AdminEmployersPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly searchQuery = signal('');

  readonly employers = signal<AdminEmployer[]>([]);
  readonly skeletonRows = SKELETON_ROWS;

  readonly filteredEmployers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.employers();
    return this.employers().filter((employer) => {
      const searchable = [
        String(employer.user_id),
        employer.email,
        employer.company_name ?? '',
        employer.company_website ?? '',
        employer.company_location ?? '',
      ];
      return searchable
        .filter((part): part is string => Boolean(part))
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  readonly rows = computed<EmployerRow[]>(() =>
    this.filteredEmployers().map((employer) => {
      const active = Boolean(Number(employer.is_active));
      return {
        employer,
        label: employer.company_name ?? 'Unnamed Company',
        active,
        statusClass: active
          ? 'text-green-700 bg-green-500/10 border-green-500/20'
          : 'text-red-700 bg-red-500/10 border-red-500/20',
        created: formatDateShort(employer.created_at),
        totalJobs: employer.total_jobs ?? 0,
      };
    }),
  );

  constructor() {
    this.loadEmployers();
  }

  private loadEmployers(): void {
    this.admin
      .employers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employers) => {
          this.employers.set(employers);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(this.message(error, 'Failed to load employers'));
        },
      });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}