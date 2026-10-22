import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiQueryParams, ApiService } from '../http/api.service';
import {
  EmployerApplicant,
  EmployerJob,
  EmployerProfile,
  EmployerStats,
  JobDraft,
} from '../models/employer';

/** Filters accepted by `GET /api/employer/applicants/:job_id`. */
export interface ApplicantQuery {
  sort_by?: 'experience' | 'date';
  proficiency?: string;
  skill_name?: string;
}

/** `status` payload of `PATCH /api/employer/status/:job_id`. */
export type JobStatusPatch = { status: 'open' | 'closed' };

/** `status` payload of `PATCH /api/employer/application-status/:id`. */
export type ApplicationStatusPatch = {
  status: 'applied' | 'shortlisted' | 'rejected' | 'hired';
};

/**
 * All employer-domain endpoints.
 *
 * One service owns every `/employer/*` URL so the nine employer pages share a
 * single contract — a route change stays a one-file edit, exactly like the
 * seeker/admin services.
 */
@Injectable({ providedIn: 'root' })
export class EmployerService {
  private readonly api = inject(ApiService);

  /** `GET /api/employer/stats` — dashboard counters. */
  stats(): Observable<EmployerStats> {
    return this.api.get<EmployerStats>('/employer/stats').pipe(
      map((envelope) => {
        if (!envelope.data) {
          throw new Error('Stats unavailable');
        }
        return envelope.data;
      }),
    );
  }

  /** `GET /api/employer/my-jobs` — every posting with its applicant count. */
  myJobs(): Observable<EmployerJob[]> {
    return this.api.get<EmployerJob[]>('/employer/my-jobs').pipe(
      map((envelope) => envelope.data ?? []),
    );
  }

  /** `POST /api/employer/post` — publishes a job and returns its new id. */
  createJob(draft: JobDraft): Observable<number> {
    return this.api.post<{ job_id: number }>('/employer/post', draft).pipe(
      map((envelope) => {
        if (!envelope.data?.job_id) {
          throw new Error('Job was not created');
        }
        return envelope.data.job_id;
      }),
    );
  }

  /** `PUT /api/employer/update/:job_id` — partial update; omitted fields stay. */
  updateJob(jobId: number, draft: Partial<JobDraft>): Observable<unknown> {
    return this.api.put(`/employer/update/${jobId}`, draft);
  }

  /** `PATCH /api/employer/status/:job_id` — opens or closes a posting. */
  updateJobStatus(jobId: number, patch: JobStatusPatch): Observable<unknown> {
    return this.api.patch(`/employer/status/${jobId}`, patch);
  }

  /** `DELETE /api/employer/delete-jobs/:job_id` — removes a posting. */
  deleteJob(jobId: number): Observable<unknown> {
    return this.api.delete(`/employer/delete-jobs/${jobId}`);
  }

  /** `GET /api/employer/applicants/:job_id` — candidates for one posting. */
  applicants(jobId: number, query: ApplicantQuery = {}): Observable<EmployerApplicant[]> {
    // Only defined filters are serialised, so the endpoint keeps its defaults.
    const params: ApiQueryParams = {};
    if (query.sort_by) params['sort_by'] = query.sort_by;
    if (query.proficiency) params['proficiency'] = query.proficiency;
    if (query.skill_name) params['skill_name'] = query.skill_name;

    return this.api
      .get<EmployerApplicant[]>(`/employer/applicants/${jobId}`, params)
      .pipe(map((envelope) => envelope.data ?? []));
  }

  /** `PATCH /api/employer/application-status/:id` — moves a candidate. */
  updateApplicationStatus(
    applicationId: number,
    patch: ApplicationStatusPatch,
  ): Observable<unknown> {
    return this.api.patch(`/employer/application-status/${applicationId}`, patch);
  }

  /**
   * `GET /api/auth/resume-download/:application_id` — streams a candidate CV.
   *
   * Routed through `HttpClient` so the bearer header is attached; the controller
   * authorises the *reviewing employer*, which a plain link cannot prove.
   */
  downloadResume(applicationId: number): Observable<Blob> {
    return this.api.download(`/auth/resume-download/${applicationId}`);
  }

  /** `GET /api/employer/profile` — the company profile. */
  profile(): Observable<EmployerProfile> {
    return this.api.get<EmployerProfile>('/employer/profile').pipe(
      map((envelope) => {
        if (!envelope.data) {
          throw new Error('Company profile unavailable');
        }
        return envelope.data;
      }),
    );
  }

  /** `PUT /api/employer/profile` — partial update of company metadata. */
  updateProfile(payload: Partial<EmployerProfile>): Observable<unknown> {
    return this.api.put('/employer/profile', payload);
  }

  /** `POST /api/employer/logo` — multipart upload under the `image` field. */
  uploadLogo(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    return this.api.postForm('/employer/logo', formData);
  }

  /**
   * Every application across all of the employer's jobs.
   *
   * The NestJS API deliberately exposes applicants *per job*
   * (`/employer/applicants/:job_id`) with no global list, so the two
   * application views fan out over `my-jobs` and flatten the results. Keeping
   * it here means both pages share one fan-out instead of duplicating it.
   */
  allApplicants(): Observable<(EmployerApplicant & { job_id: number; job_title: string })[]> {
    return this.myJobs().pipe(
      switchMap((jobs) => {
        if (jobs.length === 0) {
          return of([]);
        }
        return forkJoin(
          jobs.map((job) =>
            this.applicants(Number(job.job_id)).pipe(
              map((rows) =>
                rows.map((row) => ({
                  ...row,
                  job_id: Number(job.job_id),
                  job_title: job.title ?? 'Untitled role',
                })),
              ),
            ),
          ),
        ).pipe(map((groups) => groups.flat()));
      }),
    );
  }
}
