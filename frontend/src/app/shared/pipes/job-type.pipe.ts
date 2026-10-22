import { Pipe, PipeTransform } from '@angular/core';

/** Explicit display labels for the three employment types the API returns. */
const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  internship: 'Internship',
};

/**
 * Humanizes the API's `snake_case` job type for display.
 *
 * Lives in a pipe (not a helper function) so the mapping is reusable directly
 * in templates and stays the single place a new employment type must be added.
 */
@Pipe({ name: 'jobType', standalone: true })
export class JobTypePipe implements PipeTransform {
  /** `'full_time'` → `'Full Time'`; unknown values are title-cased as a fallback. */
  transform(value: string | null | undefined): string {
    if (!value) {
      return 'Not specified';
    }

    const known = JOB_TYPE_LABELS[value.trim().toLowerCase()];
    if (known) {
      return known;
    }

    return value
      .split('_')
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
      .join(' ');
  }
}
