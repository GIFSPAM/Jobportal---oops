import { Job, JobRow } from '../models/job';

/** Narrow unknown input to a finite number, or `undefined` when unusable. */
function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Narrow unknown input to a non-empty string, or `undefined`. */
function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Formats the `$min - $max` salary label, falling back to "Not specified".
 *
 * Centralized here so every card renders salaries identically.
 */
function formatSalary(salaryMin?: number, salaryMax?: number): string {
  if (salaryMin === undefined || salaryMax === undefined) {
    return 'Not specified';
  }
  return `$${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}`;
}

/** Maps a raw API `JobRow` onto the UI `Job` model. */
export function mapJob(row: JobRow): Job {
  const salaryMin = toNumber(row.salary_min);
  const salaryMax = toNumber(row.salary_max);

  return {
    id: Number(row.job_id),
    title: row.title ?? '',
    company: row.company_name ?? '',
    location: row.location ?? '',
    salary: formatSalary(salaryMin, salaryMax),
    type: row.job_type ?? '',
    logo: toStringOrUndefined(row.profile_picture_url),
    employerId: toNumber(row.employer_id),
    description: toStringOrUndefined(row.description),
    postedAt: toStringOrUndefined(row.posted_at),
    skills: Array.isArray(row.skills) ? row.skills.map((skill) => String(skill)) : [],
    salaryMin,
    salaryMax,
    isVerified: row.is_verified === undefined || row.is_verified === null ? undefined : Boolean(row.is_verified),
    status: toStringOrUndefined(row.status),
  };
}

/** Maps a list envelope payload, ignoring rows that fail basic validation. */
export function mapJobs(rows: readonly JobRow[] | undefined): Job[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => mapJob(row));
}
