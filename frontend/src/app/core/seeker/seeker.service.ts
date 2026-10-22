import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { ApiService } from '../http/api.service';
import {
  ApplyResult,
  CompanyDetails,
  JobMatch,
  SavedJob,
  SeekerApplication,
  SeekerOverview,
  SeekerProfile,
  SeekerStats,
} from '../models/seeker';

/** One entry of the full-replacement skills payload (`PUT /seeker/skills`). */
export interface SkillInput {
  name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * All seeker-side endpoints used outside the seeker pages themselves
 * (explore actions, saved jobs, applications, stats).
 *
 * Keeping them in core lets any role-aware feature act on a seeker session
 * without duplicating URL knowledge or response-shape assumptions.
 */
@Injectable({ providedIn: 'root' })
export class SeekerService {
  private readonly api = inject(ApiService);

  /** `GET /api/seeker/saved-jobs` */
  savedJobs(): Observable<SavedJob[]> {
    return this.api.get<SavedJob[]>('/seeker/saved-jobs').pipe(map((envelope) => envelope.data ?? []));
  }

  /** `GET /api/seeker/my-applications` */
  applications(): Observable<SeekerApplication[]> {
    return this.api
      .get<SeekerApplication[]>('/seeker/my-applications')
      .pipe(map((envelope) => envelope.data ?? []));
  }

  /**
   * Stats + applications + profile + saved jobs in one round trip.
   *
   * Port of React `fetchSeekerOverview`, so dashboards and the profile page
   * hydrate from a single request burst instead of four sequential ones.
   */
  overview(): Observable<SeekerOverview> {
    return forkJoin({
      stats: this.stats(),
      applications: this.applications(),
      profile: this.profile(),
      savedJobs: this.savedJobs(),
    });
  }

  /** `POST /api/seeker/apply/:job_id` (201 on success). */
  apply(jobId: number): Observable<ApplyResult> {
    return this.api.post<ApplyResult>(`/seeker/apply/${jobId}`, {}).pipe(
      map((envelope) => {
        if (!envelope.data) {
          throw new Error('Application failed');
        }
        return envelope.data;
      }),
    );
  }

  /** `POST /api/seeker/saved-jobs/:job_id` (201 on success). */
  saveJob(jobId: number): Observable<unknown> {
    return this.api.post<unknown>(`/seeker/saved-jobs/${jobId}`, {});
  }

  /** `DELETE /api/seeker/saved-jobs/:job_id` */
  removeSavedJob(jobId: number): Observable<unknown> {
    return this.api.delete<unknown>(`/seeker/saved-jobs/${jobId}`);
  }

  /** `GET /api/seeker/stats` — counters for dashboards and profile tiles. */
  stats(): Observable<SeekerStats> {
    return this.api.get<SeekerStats>('/seeker/stats').pipe(
      map((envelope) => {
        if (!envelope.data) {
          throw new Error('Stats unavailable');
        }
        return envelope.data;
      }),
    );
  }

  /** `DELETE /api/seeker/revoke/:application_id` — withdraws an application. */
  revoke(applicationId: number): Observable<unknown> {
    return this.api.delete(`/seeker/revoke/${applicationId}`);
  }

  /** `GET /api/seeker/job-match/:job_id` — skill match against a posting. */
  jobMatch(jobId: number): Observable<JobMatch> {
    return this.api.get<JobMatch>(`/seeker/job-match/${jobId}`).pipe(
      map((envelope) => {
        if (!envelope.data) {
          throw new Error('Match unavailable');
        }
        return envelope.data;
      }),
    );
  }

  /** `GET /api/seeker/profile` — profile plus the current skill list. */
  profile(): Observable<SeekerProfile> {
    return this.api.get<SeekerProfile>('/seeker/profile').pipe(
      map((envelope) => {
        if (!envelope.data) {
          throw new Error('Profile unavailable');
        }
        return envelope.data;
      }),
    );
  }

  /** `PUT /api/seeker/profile` — partial update of the editable fields. */
  updateProfile(payload: Partial<SeekerProfile>): Observable<unknown> {
    return this.api.put('/seeker/profile', payload);
  }

  /** `PUT /api/seeker/skills` — replaces the whole skill set (full write). */
  updateSkills(skills: SkillInput[]): Observable<unknown> {
    return this.api.put('/seeker/skills', { skills });
  }

  /** `PUT /api/seeker/profile/resume` — multipart upload, `resume` field. */
  uploadResume(file: File): Observable<string | undefined> {
    const formData = new FormData();
    formData.append('resume', file, file.name);
    return this.api.putForm<{ resume_path?: string }>('/seeker/profile/resume', formData).pipe(
      map((envelope) => envelope.data?.resume_path),
    );
  }

  /** `POST /api/seeker/photo` — multipart avatar upload, `image` field. */
  uploadPhoto(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('image', file, file.name);
    return this.api.postForm('/seeker/photo', formData);
  }

  /**
   * `GET /api/seeker/profile/resume/download` — streams the stored file.
   *
   * Returned as a `Blob` because the endpoint requires the bearer header, so a
   * plain link would 401; the page turns the blob into a temporary object URL.
   */
  downloadResume(): Observable<Blob> {
    return this.api.download('/seeker/profile/resume/download');
  }

  /**
   * `GET /api/seeker/jobs/employer/:job_id` — company details behind a posting.
   *
   * `null` when the API returned no payload so callers can fall back to the
   * job's own company fields (mirrors React `fetchSeekerEmployerDetailsByJob`).
   */
  employerOfJob(jobId: number): Observable<CompanyDetails | null> {
    return this.api.get<CompanyDetails>(`/seeker/jobs/employer/${jobId}`).pipe(
      map((envelope) => envelope.data ?? null),
    );
  }
}
