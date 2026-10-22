import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { AdminLog } from '../../core/models/admin';
import { IconComponent, SkeletonComponent } from '../../shared';
import { actionToneClass, formatDateTime, targetTableLabel } from './admin-format';

/** Placeholder bars shown while the log list loads. */
const SKELETON_ROWS = [1, 2, 3, 4];

/** A log row with its labels/tone precomputed. */
interface LogRow {
  log: AdminLog;
  adminLabel: string;
  actionLabel: string;
  actionClass: string;
  targetLabel: string;
  timeLabel: string;
}

/**
 * `logs` tab of the admin dashboard: the audit trail table with search and
 * target-table filters (ports the React `AdminLogsTab`).
 *
 * Pure presentation — the page owns the data and filter state.
 */
@Component({
  selector: 'app-admin-logs-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SkeletonComponent, NgClass],
  template: `
    <div class="glass-card p-8">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-6">
        <div>
          <h2 class="text-lg font-display font-bold text-[#1F2A24] flex items-center gap-2">
            <app-icon class="text-brand-accent" name="undo" [size]="20" /> Admin Logs
          </h2>
          <p class="text-sm text-text-muted mt-1">
            {{ filteredLogs().length }} shown of {{ logs().length }} entries
          </p>
        </div>

        <div
          class="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(12rem,0.8fr)]"
        >
          <div class="space-y-1 min-w-0">
            <label
              for="admin-log-search"
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
                #logSearchEl
                id="admin-log-search"
                type="search"
                class="input-field input-field-with-icon h-12 w-full min-w-0"
                placeholder="Action, table, admin email, or target ID"
                [value]="logSearchQuery()"
                (input)="searchChange.emit(logSearchEl.value)"
              />
            </div>
          </div>

          <div class="space-y-1 min-w-0">
            <label
              for="admin-log-target"
              class="text-[10px] font-bold uppercase tracking-widest text-text-muted"
            >
              Target Table
            </label>
            <div class="relative">
              <app-icon
                class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                name="filter"
                [size]="16"
              />
              <select
                #targetEl
                id="admin-log-target"
                class="input-field input-field-with-icon h-12 w-full min-w-0"
                [value]="logTableFilter()"
                (change)="tableFilterChange.emit(targetEl.value)"
              >
                <option value="all">All Targets</option>
                @for (table of availableLogTypes(); track table) {
                  <option [value]="table">{{ targetTableLabel(table) }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (row of skeletonRows; track row) {
            <app-skeleton variant="row" />
          }
        </div>
      } @else if (logs().length === 0) {
        <p class="text-sm text-text-muted text-center py-10">No admin logs yet.</p>
      } @else if (filteredLogs().length === 0) {
        <p class="text-sm text-text-muted text-center py-10">
          No log entries match current filters.
        </p>
      } @else {
        <div class="max-h-[68vh] overflow-auto rounded-xl border border-[#E8E3D8] bg-[#FAF8F3]">
          <table class="w-full min-w-220 text-left border-collapse">
            <thead
              class="sticky top-0 z-10 bg-brand-bg/90 backdrop-blur-sm border-b border-[#E8E3D8]"
            >
              <tr>
                <th scope="col" class="px-4 py-3 text-xs uppercase tracking-widest text-text-muted font-bold">Log ID</th>
                <th scope="col" class="px-4 py-3 text-xs uppercase tracking-widest text-text-muted font-bold">Admin</th>
                <th scope="col" class="px-4 py-3 text-xs uppercase tracking-widest text-text-muted font-bold">Action</th>
                <th scope="col" class="px-4 py-3 text-xs uppercase tracking-widest text-text-muted font-bold">Target</th>
                <th scope="col" class="px-4 py-3 text-xs uppercase tracking-widest text-text-muted font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.log.log_id) {
                <tr class="border-b border-[#EFE9DD] hover:bg-[#FAF8F3] transition-colors">
                  <td class="px-4 py-3 text-sm text-[#1F2A24] whitespace-nowrap">#{{ row.log.log_id }}</td>
                  <td class="px-4 py-3 text-sm text-[#1F2A24] whitespace-nowrap">{{ row.adminLabel }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span
                      class="text-xs px-2.5 py-1 rounded-full border font-bold whitespace-nowrap"
                      [ngClass]="row.actionClass"
                    >
                      {{ row.actionLabel }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                    {{ row.targetLabel }}
                  </td>
                  <td class="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5">
                      <app-icon class="text-yellow-700" name="calendar" [size]="16" />
                      {{ row.timeLabel }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminLogsTabComponent {
  /** True while the dashboard data is still loading. */
  readonly loading = input(false);

  /** All log entries (for the "shown of" counter). */
  readonly logs = input<AdminLog[]>([]);

  /** Entries after the page's search + target-table filters. */
  readonly filteredLogs = input<AdminLog[]>([]);

  /** Current search text. */
  readonly logSearchQuery = input('');

  /** Selected target-table filter (`'all'` for no filter). */
  readonly logTableFilter = input('all');

  /** Target table options derived from the loaded entries. */
  readonly availableLogTypes = input<string[]>([]);

  /** Emits the new search text on every keystroke. */
  readonly searchChange = output<string>();

  /** Emits the newly selected target-table filter. */
  readonly tableFilterChange = output<string>();

  /** Placeholder bars rendered while loading. */
  readonly skeletonRows = SKELETON_ROWS;

  /** Rows with labels/tones precomputed for the table. */
  readonly rows = computed<LogRow[]>(() =>
    this.filteredLogs().map((log) => ({
      log,
      adminLabel: log.admin_email ?? `Admin #${log.admin_id}`,
      actionLabel: log.action_type ?? 'Unknown action',
      actionClass: actionToneClass(log.action_type),
      targetLabel: `${targetTableLabel(log.target_table)} #${log.target_id ?? 'Unknown'}`,
      timeLabel: formatDateTime(log.action_time),
    })),
  );

  /** Template-facing wrapper so the option list uses the shared label rule. */
  readonly targetTableLabel = targetTableLabel;
}
