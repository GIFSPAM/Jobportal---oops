import { Job } from '../../core/models/job';

/** Sentinel value meaning "no filter". */
const ALL = 'all';

/** Distinct job types present in the list, prefixed with the `all` option. */
export function uniqueJobTypesFrom(jobs: readonly Job[]): string[] {
  const types = new Set<string>();
  for (const job of jobs) {
    if (job.type) {
      types.add(job.type);
    }
  }
  return [ALL, ...types];
}

/** Distinct skills present in the list, prefixed with the `all` option. */
export function uniqueSkillsFrom(jobs: readonly Job[]): string[] {
  const skills = new Set<string>();
  for (const job of jobs) {
    for (const skill of job.skills ?? []) {
      if (skill) {
        skills.add(skill);
      }
    }
  }
  return [ALL, ...skills];
}

/** The three explore filters as plain values. */
export interface ExploreFilters {
  searchQuery: string;
  jobTypeFilter: string;
  skillFilter: string;
}

/**
 * Applies the explore filters to a job list.
 *
 * Kept as a pure function (ported from the React `jobExploreFilters` util) so
 * the filtering rules can be unit-tested without a component.
 */
export function filterJobsForExplore(jobs: readonly Job[], filters: ExploreFilters): Job[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const typeFilter = filters.jobTypeFilter.toLowerCase();
  const skillFilter = filters.skillFilter.toLowerCase();

  return jobs.filter((job) => {
    if (filters.jobTypeFilter !== ALL && String(job.type ?? '').toLowerCase() !== typeFilter) {
      return false;
    }
    if (filters.skillFilter !== ALL) {
      const hasSkill = (job.skills ?? []).some(
        (skill) => String(skill).toLowerCase() === skillFilter,
      );
      if (!hasSkill) {
        return false;
      }
    }
    if (!query) {
      return true;
    }
    const haystack = [job.title, job.company, job.location, job.type]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');
    return haystack.includes(query);
  });
}
