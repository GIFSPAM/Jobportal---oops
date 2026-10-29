/** Possible states of a seeker's application, as returned by the API. */
export type ApplicationStatus = 'applied' | 'shortlisted' | 'rejected' | 'hired';

/** Row of `GET /api/seeker/my-applications`. */
export interface SeekerApplication {
  application_id: number;
  job_id?: number;
  title?: string;
  company_name?: string;
  location?: string;
  status?: ApplicationStatus | string;
  applied_at?: string;
  [key: string]: unknown;
}

/** Row of `GET /api/seeker/saved-jobs`. */
export interface SavedJob {
  job_id: number;
  title?: string;
  company_name?: string;
  location?: string;
  job_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: string;
  is_verified?: boolean;
  posted_at?: string;
  saved_at?: string;
  skills?: string[];
  [key: string]: unknown;
}

/** `data` of `GET /api/seeker/stats`. */
export interface SeekerStats {
  total_applications: number;
  applications_by_status: {
    applied: number;
    shortlisted: number;
    rejected: number;
    hired: number;
    [key: string]: number;
  };
  saved_jobs: number;
  skills_count: number;
}

/** `data` of `POST /api/seeker/apply/:job_id`. */
export interface ApplyResult {
  application_id: number;
  seeker_id: number;
}

/** One skill entry of the seeker profile / skills payload. */
export interface SeekerSkill {
  name: string;
  proficiency: string;
}

/** Profile row of `GET /api/seeker/profile` (plus its skill list). */
export interface SeekerProfile {
  seeker_id: number;
  full_name: string | null;
  phone_number: string | null;
  education: string | null;
  experience_years: number | null;
  resume_path: string | null;
  resume_filename: string | null;
  profile_picture_url: string | null;
  skills: SeekerSkill[];
}

export interface JobMatch {
  job_id: number;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
}

/** Bundled payload behind `GET stats + applications + profile + saved-jobs`. */
export interface SeekerOverview {
  stats: SeekerStats;
  applications: SeekerApplication[];
  profile: SeekerProfile;
  savedJobs: SavedJob[];
}

export interface CompanyDetails {
  employer_id: number;
  company_name: string | null;
  crn?: string | null;
  /** Company avatar, when the employer has uploaded one. */
  logo_url?: string | null;
  company_phone: string | null;
  industry: string | null;
  company_size: string | null;
  company_location: string | null;
  company_website: string | null;
}
