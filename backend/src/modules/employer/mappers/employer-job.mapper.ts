import { csvToSkills, normalizeSkillInputs } from '../../../database/sql';
import { normalizeSkillName } from '../../../common/enums/domain.enum';

/** Row returned by the employer's own job listing. */
export interface EmployerJobDto {
  job_id: number;
  employer_id: number;
  title: string | null;
  description: string | null;
  location: string | null;
  job_type: string | null;
  status: string;
  is_verified: boolean;
  verified_by: number | null;
  verified_at: Date | null;
  posted_at: Date;
  salary_min: number | null;
  salary_max: number | null;
  applicant_count: number;
  skills: string[];
  crn?: string | null;
}

export const toEmployerJobDto = (row: Record<string, unknown>): EmployerJobDto => ({
  job_id: Number(row.job_id),
  employer_id: Number(row.employer_id),
  title: row.title as string | null,
  description: row.description as string | null,
  location: row.location as string | null,
  job_type: row.job_type as string | null,
  status: row.status as string,
  is_verified: Boolean(Number(row.is_verified)),
  verified_by: row.verified_by === null ? null : Number(row.verified_by),
  verified_at: (row.verified_at as Date | null) ?? null,
  posted_at: row.posted_at as Date,
  salary_min: row.salary_min === null || row.salary_min === undefined ? null : Number(row.salary_min),
  salary_max: row.salary_max === null || row.salary_max === undefined ? null : Number(row.salary_max),
  applicant_count: Number(row.applicant_count ?? 0),
  skills: csvToSkills(row.skills_list as string | null),
  crn: (row.crn as string | null) ?? null,
});

/** One applicant row as presented to the hiring employer. */
export interface ApplicantDto {
  application_id: number;
  application_status: string;
  applied_at: Date;
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

/** Normalizes and deduplicates skill inputs using the domain's canonical `normalizeSkillName` (trim + lowercase). */
export const normalizeSkillInput = (values: string[] | undefined): string[] =>
  normalizeSkillInputs(values, normalizeSkillName);
