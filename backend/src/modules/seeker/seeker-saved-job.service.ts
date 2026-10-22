import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictError, NotFoundError } from '../../common/exceptions/domain.exceptions';
import { csvToSkills, skillsCsvSubquery } from '../../database/sql';
import { Employer, Job, SavedJob } from '../../database/entities';

export interface SavedJobDto {
  job_id: number;
  title: string | null;
  location: string | null;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  is_verified: boolean;
  posted_at: Date;
  company_name: string | null;
  saved_at: Date;
  skills: string[];
}

/** Job bookmarking — a seeker's private shortlist. */
@Injectable()
export class SeekerSavedJobService {
  constructor(
    @InjectRepository(SavedJob) private readonly savedJobs: Repository<SavedJob>,
  ) {}

  async save(seekerId: number, jobId: number): Promise<void> {
    const existing = await this.savedJobs.findOne({ where: { seekerId, jobId } });
    if (existing) {
      throw new ConflictError('Job already saved.');
    }

    await this.savedJobs.insert({ seekerId, jobId });
  }

  async remove(seekerId: number, jobId: number): Promise<void> {
    const result = await this.savedJobs.delete({ seekerId, jobId });
    if (result.affected === 0) {
      throw new NotFoundError('Saved job not found.');
    }
  }

  async list(seekerId: number): Promise<{ data: SavedJobDto[]; count: number }> {
    const rows = await this.savedJobs
      .createQueryBuilder('sj')
      .innerJoin(Job, 'job', 'job.job_id = sj.job_id')
      .innerJoin(Employer, 'e', 'e.employer_id = job.employer_id')
      .select('job.job_id', 'job_id')
      .addSelect('job.title', 'title')
      .addSelect('job.location', 'location')
      .addSelect('job.job_type', 'job_type')
      .addSelect('job.salary_min', 'salary_min')
      .addSelect('job.salary_max', 'salary_max')
      .addSelect('job.status', 'status')
      .addSelect('job.is_verified', 'is_verified')
      .addSelect('job.posted_at', 'posted_at')
      .addSelect('e.company_name', 'company_name')
      .addSelect('sj.saved_at', 'saved_at')
      .addSelect(skillsCsvSubquery('job'), 'skills_list')
      .where('sj.seeker_id = :seekerId', { seekerId })
      .orderBy('sj.saved_at', 'DESC')
      .getRawMany<Record<string, unknown> & { skills_list: string | null }>();

    const data = rows.map<SavedJobDto>((row) => ({
      job_id: Number(row.job_id),
      title: row.title as string | null,
      location: row.location as string | null,
      job_type: row.job_type as string | null,
      salary_min: row.salary_min === null ? null : Number(row.salary_min),
      salary_max: row.salary_max === null ? null : Number(row.salary_max),
      status: row.status as string,
      is_verified: Boolean(Number(row.is_verified)),
      posted_at: row.posted_at as Date,
      company_name: row.company_name as string | null,
      saved_at: row.saved_at as Date,
      skills: csvToSkills(row.skills_list),
    }));

    return { data, count: data.length };
  }
}
