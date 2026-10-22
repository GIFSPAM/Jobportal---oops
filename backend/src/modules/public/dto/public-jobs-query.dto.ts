import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const toInt = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

/** Query contract for the public job feed. */
export class PublicJobsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(['full_time', 'part_time', 'internship'], {
    message: 'job_type must be one of: full_time, part_time, internship.',
  })
  job_type?: string;

  /** Comma-separated skill names, e.g. `node.js,sql`. */
  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsIn(['salary', 'date'], { message: 'sort_by must be one of: salary, date.' })
  sort_by?: string;

  @Transform(toInt)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50, { message: 'limit cannot exceed 50.' })
  limit?: number;
}

export class SkillSearchQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
