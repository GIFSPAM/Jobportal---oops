import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { JobStatus, JobType } from '../../../common/enums/domain.enum';

export class AdminJobsQueryDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  location?: string;

  @IsOptional() @IsIn(Object.values(JobType))
  job_type?: JobType;

  @IsOptional() @IsIn(['salary', 'date'])
  sort_by?: string;

  @IsOptional() @IsIn(Object.values(JobStatus))
  status?: JobStatus;

  @IsOptional() @IsString()
  is_verified?: string;

  @IsOptional() @IsString()
  skills?: string;
}

export class UpdateUserStatusDto {
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean({ message: 'is_active must be boolean.' })
  is_active!: boolean;
}
