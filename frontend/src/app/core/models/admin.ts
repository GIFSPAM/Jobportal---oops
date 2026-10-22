export interface AdminStats {
  users?: { total?: number; employers?: number; seekers?: number };
  jobs?: { total?: number; verified?: number; open?: number };
  applications?: {
    total?: number;
    applied?: number;
    shortlisted?: number;
    rejected?: number;
    hired?: number;
  };
}

export interface AdminUser {
  user_id: number;
  email: string;
  role: 'jobseeker' | 'employer' | 'admin' | string;
  is_active: boolean | number;
  created_at?: string;
  full_name?: string;
  avatar_url?: string;
  profile_picture_url?: string;
  company_name?: string;
  company_website?: string;
  phone_number?: string;
  education?: string;
  experience_years?: number;
  company_phone?: string;
  industry?: string;
  company_size?: string;
  company_location?: string;
  seeker_profile_picture_url?: string;
  employer_profile_picture_url?: string;
}

export interface AdminJob {
  job_id: number;
  employer_id?: number;
  title: string;
  description?: string;
  location?: string;
  job_type?: string;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  status?: string;
  is_verified?: boolean;
  posted_at?: string;
  company_name?: string;
  company_website?: string;
  profile_picture_url?: string;
  logo?: string;
  skills?: string[];
}

export interface AdminLog {
  log_id: number;
  admin_id: number;
  action_type?: string;
  target_table?: string;
  target_id?: number;
  action_time?: string;
  admin_email?: string;
}

/** Row of `GET /api/admin/employers` — company directory with job counts. */
export interface AdminEmployer {
  user_id: number;
  email: string;
  is_active: boolean | number;
  created_at?: string;
  company_name?: string | null;
  industry?: string | null;
  company_size?: string | null;
  company_location?: string | null;
  company_website?: string | null;
  company_phone?: string | null;
  total_jobs?: number;
}

/** Row of `GET /api/admin/seekers` — job seeker directory with application counts. */
export interface AdminSeeker {
  user_id: number;
  email: string;
  is_active: boolean | number;
  created_at?: string;
  full_name?: string | null;
  phone_number?: string | null;
  education?: string | null;
  experience_years?: number | null;
  total_applications?: number;
}

