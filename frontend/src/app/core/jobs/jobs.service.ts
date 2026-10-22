import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiQueryParams, ApiService } from '../http/api.service';
import { mapJob, mapJobs } from '../mappers/job.mapper';
import { Job, JobRow, SkillOption, SkillRow } from '../models/job';

/** Sentinel value meaning "no filter" — never sent to the API. */
const ALL = 'all';

/**
 * Query contract of `GET /api/public/jobs` (mirrors `PublicJobsQueryDto`).
 *
 * Every field is optional; anything left as `''`/`'all'` is dropped by
 * {@link JobsService.searchJobs} so the request carries only real filters.
 */
export interface PublicJobFilters {
  search?: string;
  location?: string;
  job_type?: string;
  skills?: string;
  sort_by?: 'salary' | 'date';
  limit?: number;
}

/**
 * Read-only access to the public job catalogue.
 *
 * Centralizes the public endpoints (and their row→UI mapping) so pages only
 * ever see {@link Job} and never a raw `JobRow`.
 */
@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly api = inject(ApiService);

  /** `GET /api/public/landing-jobs` — the short list shown on the home page. */
  landingJobs(): Observable<Job[]> {
    return this.api.get<JobRow[]>('/public/landing-jobs').pipe(map((envelope) => mapJobs(envelope.data)));
  }

  /** `GET /api/public/jobs` — the full catalogue used by explore. */
  publicJobs(): Observable<Job[]> {
    return this.api.get<JobRow[]>('/public/jobs').pipe(map((envelope) => mapJobs(envelope.data)));
  }

  /**
   * `GET /api/public/jobs` with the server-side filter contract.
   *
   * Used by the public `/jobs` browse page so large catalogues are filtered by
   * the database instead of shipping every row to the client.
   */
  searchJobs(filters: PublicJobFilters = {}): Observable<Job[]> {
    const params: ApiQueryParams = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && value !== ALL) {
        params[key] = value as string;
      }
    }
    return this.api.get<JobRow[]>('/public/jobs', params).pipe(map((e) => mapJobs(e.data)));
  }

  /** `GET /api/public/jobs/:job_id` — a single job including its description. */
  jobById(jobId: number): Observable<Job> {
    return this.api.get<JobRow>(`/public/jobs/${jobId}`).pipe(
      map((envelope) => {
        if (!envelope.data) {
          throw new Error('Job not found');
        }
        return mapJob(envelope.data);
      }),
    );
  }

  /** `GET /api/public/skills?search=` — typeahead suggestions for skill filters. */
  skills(search: string): Observable<SkillOption[]> {
    return this.api.get<SkillRow[]>('/public/skills', { search }).pipe(
      map((envelope) =>
        (envelope.data ?? [])
          .map((row) => ({
            skill_id: row.skillId ?? row.skill_id ?? 0,
            skill_name: (row.skillName ?? row.skill_name ?? '').trim(),
          }))
          .filter((skill) => skill.skill_name.length > 0),
      ),
    );
  }
}
