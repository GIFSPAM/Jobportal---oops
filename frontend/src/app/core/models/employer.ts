export interface EmployerProfile {
  employer_id?: number;
  company_name: string | null;
  crn?: string | null;
  industry?: string | null;
  company_size?: string | null;
  company_location?: string | null;
  company_website?: string | null;
  company_phone?: string | null;
  profile_picture_url?: string | null;
}

export interface EmployerStats {
  total_jobs: number;
  open_jobs?: number;
  closed_jobs?: number;
  verified_jobs?: number;
  total_applications: number;
  applications_by_status?: {
    applied: number;
    shortlisted: number;
    rejected: number;
    hired: number;
    [key: string]: number;
  };
}

export interface EmployerJob {
  job_id: number;
  employer_id: number;
  title: string | null;
  description: string | null;
  location: string | null;
  job_type: string | null;
  status: string;
  is_verified: boolean;
  posted_at: string | Date;
  salary_min: number | null;
  salary_max: number | null;
  applicant_count: number;
  skills: string[];
  crn?: string | null;
}

export interface EmployerApplicant {
  application_id: number;
  application_status: string;
  applied_at: string | Date;
  job_id?: number;
  job_title?: string;
  seeker: {
    seeker_id: number;
    full_name: string | null;
    education: string | null;
    experience_years: number | null;
    phone_number: string | null;
    avatar_url: string | null;
    resume_url: string | null;
    skills: { name: string; proficiency: string }[];
  };
}

export interface JobDraft {
  title: string;
  description: string;
  location: string;
  job_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  skills?: string[];
}
