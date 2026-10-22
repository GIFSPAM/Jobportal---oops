import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiQueryParams, ApiService } from '../http/api.service';
import {
  AdminEmployer,
  AdminJob,
  AdminLog,
  AdminSeeker,
  AdminStats,
  AdminUser,
} from '../models/admin';

/**
 * Admin-domain API surface (moderation, users, company directory, audit logs).
 *
 * Thin wrapper over `ApiService` so admin pages never build URLs themselves.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  /** Platform-wide counters for the admin overview tiles. */
  stats(): Observable<AdminStats> {
    return this.api.get<AdminStats>('/admin/stats').pipe(map((e) => e.data ?? {}));
  }

  /** Every registered account, for the users page. */
  users(): Observable<AdminUser[]> {
    return this.api.get<AdminUser[]>('/admin/users').pipe(map((e) => e.data ?? []));
  }

  /** A single account; errors when the backend returns no `data`. */
  user(userId: number): Observable<AdminUser> {
    return this.api.get<AdminUser>(`/admin/users/${userId}`).pipe(
      map((e) => {
        if (!e.data) throw new Error('User not found.');
        return e.data;
      }),
    );
  }

  /** Company directory (`GET /admin/employers`), newest accounts first. */
  employers(): Observable<AdminEmployer[]> {
    return this.api.get<AdminEmployer[]>('/admin/employers').pipe(map((e) => e.data ?? []));
  }

  /** Job seeker directory (`GET /admin/seekers`), newest accounts first. */
  seekers(): Observable<AdminSeeker[]> {
    return this.api.get<AdminSeeker[]>('/admin/seekers').pipe(map((e) => e.data ?? []));
  }

  /**
   * Every job post regardless of verification state, for moderation.
   *
   * Optional filters map 1:1 onto `AdminJobsQueryDto`.
   */
  jobs(filters: Partial<Record<'search' | 'location' | 'job_type' | 'status' | 'is_verified' | 'sort_by', string>> = {}): Observable<AdminJob[]> {
    const params: ApiQueryParams = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value) params[key] = value;
    }
    return this.api.get<AdminJob[]>('/admin/all-jobs', params).pipe(map((e) => e.data ?? []));
  }

  /** Audit log entries, newest first. */
  logs(): Observable<AdminLog[]> {
    return this.api.get<AdminLog[]>('/admin/logs').pipe(map((e) => e.data ?? []));
  }

  /**
   * A single job resolved from the moderation list.
   *
   * The backend exposes no `/admin/jobs/:job_id` route, so — exactly like the
   * React `fetchAdminJobById` — the id is matched client-side over `all-jobs`.
   */
  job(jobId: number): Observable<AdminJob> {
    return this.jobs().pipe(
      map((jobs) => {
        const job = jobs.find((item) => Number(item.job_id) === Number(jobId));
        if (!job) throw new Error('Job not found.');
        return job;
      }),
    );
  }

  /** Activates or deactivates an account. */
  setUserActive(userId: number, isActive: boolean): Observable<unknown> {
    return this.api.patch(`/admin/users/${userId}/status`, { is_active: isActive });
  }

  /** Permanently removes an account and its related data. */
  deleteUser(userId: number): Observable<unknown> {
    return this.api.delete(`/admin/users/${userId}`);
  }

  /** Marks a job post as verified so it becomes publicly visible. */
  verifyJob(jobId: number): Observable<unknown> {
    return this.api.patch(`/admin/verify-job/${jobId}`, {});
  }

  /** Pulls a job post back out of the public catalogue. */
  unverifyJob(jobId: number): Observable<unknown> {
    return this.api.patch(`/admin/unverify-job/${jobId}`, {});
  }

  /** Permanently removes a job post and its applications. */
  deleteJob(jobId: number): Observable<unknown> {
    return this.api.delete(`/admin/jobs/${jobId}`);
  }
}
