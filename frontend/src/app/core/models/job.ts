/** Lifecycle of a job posting as stored by the API. */
export type JobStatus = 'open' | 'closed';

/** Employment types as serialized by the API (`snake_case`). */
export type JobType = 'full_time' | 'part_time' | 'internship';

/**
 * Raw `JobRow` shape returned by every public jobs endpoint.
 *
 * Kept snake_case on purpose: it is a *transport* shape, so the API contract can
 * change in exactly one place (the mapper) instead of leaking across the app.
 */
export interface JobRow {
  job_id: number;
  title: string;
  description?: string;
  location: string;
  job_type: JobType | string;
  salary_min: number | null;
  salary_max: number | null;
  status: JobStatus | string;
  is_verified: 0 | 1 | boolean;
  posted_at: string;
  company_name: string;
  employer_id: number;
  profile_picture_url?: string | null;
  skills: string[];
}

/**
 * UI-facing job model consumed by components.
 *
 * Everything presentation-unfriendly (raw salary numbers, snake_case keys) has
 * already been normalized so templates only ever interpolate plain strings.
 */
export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  logo?: string;
  employerId?: number;
  description?: string;
  postedAt?: string;
  skills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  isVerified?: boolean;
  status?: string;
}

/**
 * Shape of `GET /api/public/skills` rows.
 *
 * The endpoint returns raw `Skill` entities, so the properties arrive in
 * TypeORM's camelCase (`skillId`/`skillName`); both spellings are declared
 * here and normalised in `JobsService.skills`.
 */
export interface SkillRow {
  skillId?: number;
  skillName?: string;
  skill_id?: number;
  skill_name?: string;
}

/** Normalised skill suggestion handed to the UI. */
export interface SkillOption {
  skill_id: number;
  skill_name: string;
}
