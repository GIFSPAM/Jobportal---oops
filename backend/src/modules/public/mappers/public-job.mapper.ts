import { csvToSkills, toNumber } from '../../../database/sql';

/** Public job read model — the exact shape returned by `/public/jobs`. */
export interface PublicJobDto {
  job_id: number;
  title: string | null;
  description?: string | null;
  location: string | null;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  posted_at: Date | string;
  company_name: string | null;
  crn?: string | null;
  status: string;
  is_verified: boolean;
  profile_picture_url: string | null;
  employer_id: number;
  skills: string[];
}

/** Raw row produced by the job select (skills arrive as a CSV sub-select). */
export interface JobRawRow {
  job_id: number | string;
  title: string | null;
  description?: string | null;
  location: string | null;
  job_type: string | null;
  salary_min: number | string | null;
  salary_max: number | string | null;
  posted_at: Date | string;
  company_name: string | null;
  crn?: string | null;
  status: string;
  is_verified: number | boolean;
  profile_picture_url: string | null;
  employer_id: number | string;
  skills_list: string | null;
}

export function toPublicJobDto(row: JobRawRow, includeDescription = false): PublicJobDto {
  const dto: PublicJobDto = {
    job_id: Number(row.job_id),
    title: row.title,
    location: row.location,
    job_type: row.job_type,
    salary_min: toNumber(row.salary_min),
    salary_max: toNumber(row.salary_max),
    posted_at: row.posted_at,
    company_name: row.company_name,
    crn: (row.crn as string | null) ?? null,
    status: row.status,
    is_verified: Boolean(Number(row.is_verified)),
    profile_picture_url: row.profile_picture_url,
    employer_id: Number(row.employer_id),
    skills: csvToSkills(row.skills_list),
  };

  if (includeDescription) {
    dto.description = row.description;
  }

  return dto;
}
