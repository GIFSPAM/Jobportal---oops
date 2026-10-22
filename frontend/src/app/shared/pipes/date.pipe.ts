import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a date value (string | Date | undefined) to a localized string.
 *
 * Returns "Unknown" for invalid/missing input. Uses the browser's locale
 * with year/month/day to match the existing `toLocaleDateString` calls
 * scattered across pages.
 */
@Pipe({ name: 'appDate', standalone: true })
export class DatePipe implements PipeTransform {
  transform(
    value: string | Date | undefined | null,
    format: 'date' | 'datetime' = 'date',
  ): string {
    if (value === undefined || value === null) return 'Unknown';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Unknown';

    if (format === 'datetime') {
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}