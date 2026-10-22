import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ApplicationStatus, CompanySize, JobStatus } from '../../../common/enums/domain.enum';

/** Hyphenated aliases accepted by the original API are normalised in the service. */
export const ACCEPTED_JOB_TYPES = [
  'full_time',
  'part_time',
  'internship',
  'full-time',
  'part-time',
] as const;

export class CreateJobDto {
  @IsString({ message: 'title is required.' })
  @Length(1, 100)
  title!: string;

  @IsString({ message: 'description is required.' })
  description!: string;

  @IsString({ message: 'location is required.' })
  @Length(1, 100)
  location!: string;

  @IsIn(ACCEPTED_JOB_TYPES, {
    message: 'job_type must be one of: full_time, part_time, internship.',
  })
  job_type!: string;

  @IsOptional() @IsInt() @Min(0)
  salary_min?: number;

  @IsOptional() @IsInt() @Min(0)
  salary_max?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

/** Partial update: every field optional, absent fields are left untouched. */
export class UpdateJobDto {
  @IsOptional() @IsString() @Length(1, 100)
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString() @Length(1, 100)
  location?: string;

  @IsOptional()
  @IsIn(ACCEPTED_JOB_TYPES, {
    message: 'job_type must be one of: full_time, part_time, internship.',
  })
  job_type?: string;

  @IsOptional() @IsInt() @Min(0)
  salary_min?: number;

  @IsOptional() @IsInt() @Min(0)
  salary_max?: number;

  /** Present (even empty) means "replace the whole skill set". */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

export class UpdateJobStatusDto {
  @IsEnum(JobStatus, { message: 'status must be either open or closed.' })
  status!: JobStatus;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus, {
    message: 'status must be one of: applied, shortlisted, rejected, hired.',
  })
  status!: ApplicationStatus;
}

export class UpdateEmployerProfileDto {
  @IsOptional() @IsString() @Length(0, 100)
  company_name?: string;

  @IsOptional() @IsString() @Length(0, 20)
  company_phone?: string;

  @IsOptional() @IsString() @Length(0, 100)
  industry?: string;

  @IsOptional() @IsEnum(CompanySize)
  company_size?: CompanySize;

  @IsOptional() @IsString() @Length(0, 100)
  company_location?: string;

  @IsOptional() @IsString() @Length(0, 150)
  company_website?: string;
}

export class ApplicantQueryDto {
  @IsOptional() @IsIn(['experience', 'date'])
  sort_by?: string;

  @IsOptional() @IsString()
  proficiency?: string;

  @IsOptional() @IsString()
  skill_name?: string;
}
