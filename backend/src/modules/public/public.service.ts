import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { JobStatus, normalizeSkillName } from '../../common/enums/domain.enum';
import { Employer, Job, Skill } from '../../database/entities';
import { skillsCsvSubquery } from '../../database/sql';
import { PublicJobsQueryDto } from './dto/public-jobs-query.dto';
import {
  toPublicJobDto,
  type JobRawRow,
  type PublicJobDto,
} from './mappers/public-job.mapper';

/** Anonymous, read-only job catalogue. */
@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Skill) private readonly skills: Repository<Skill>,
  ) {}

  async findJobs(
    query: PublicJobsQueryDto,
    defaultLimit?: number,
  ): Promise<{ data: PublicJobDto[]; count: number }> {
    const qb = this.baseQuery()
      .where('j.is_verified = TRUE')
      .orderBy('j.posted_at', 'DESC');

    this.applyFilters(qb, query);

    const limit = query.limit ?? defaultLimit;
    if (limit) {
      qb.limit(limit);
    }

    if (query.sort_by === 'salary') {
      qb.orderBy('j.salary_max', 'DESC');
    }

    const rows = await qb.getRawMany<JobRawRow>();
    const data = rows.map((row) => toPublicJobDto(row));

    return { data, count: data.length };
  }

  async findJobById(jobId: number): Promise<PublicJobDto> {
    const row = await this.baseQuery()
      .addSelect('j.description', 'description')
      .andWhere('j.job_id = :jobId', { jobId })
      .andWhere('j.status = :status', { status: JobStatus.OPEN })
      .andWhere('j.is_verified = TRUE')
      .limit(1)
      .getRawOne<JobRawRow>();

    if (!row) {
      throw new NotFoundException('Job not found or unavailable.');
    }

    return toPublicJobDto(row, true);
  }

  async findSkills(search?: string): Promise<Skill[]> {
    const qb = this.skills
      .createQueryBuilder('s')
      .orderBy('s.skill_name', 'ASC');

    const term = search?.trim();
    if (term) {
      qb.andWhere('s.skill_name LIKE :search', { search: `%${term}%` });
    }

    return qb.getMany();
  }

  private baseQuery(): SelectQueryBuilder<Job> {
    return this.jobs
      .createQueryBuilder('j')
      .innerJoin(Employer, 'e', 'e.employer_id = j.employer_id')
      .select('j.job_id', 'job_id')
      .addSelect('j.title', 'title')
      .addSelect('j.location', 'location')
      .addSelect('j.job_type', 'job_type')
      .addSelect('j.salary_min', 'salary_min')
      .addSelect('j.salary_max', 'salary_max')
      .addSelect('j.posted_at', 'posted_at')
      .addSelect('j.employer_id', 'employer_id')
      .addSelect('j.status', 'status')
      .addSelect('j.is_verified', 'is_verified')
      .addSelect('e.company_name', 'company_name')
      .addSelect('e.profile_picture_url', 'profile_picture_url')
      .addSelect(skillsCsvSubquery('j'), 'skills_list');
  }

  private applyFilters(qb: SelectQueryBuilder<Job>, query: PublicJobsQueryDto): void {
    if (query.search) {
      qb.andWhere('j.title LIKE :search', { search: `%${query.search}%` });
    }

    if (query.location) {
      qb.andWhere('j.location = :location', { location: query.location });
    }

    if (query.job_type) {
      qb.andWhere('j.job_type = :jobType', { jobType: query.job_type });
    }

    const skills = (query.skills ?? '')
      .split(',')
      .map(normalizeSkillName)
      .filter(Boolean);

    if (skills.length > 0) {
      qb.andWhere(
        `j.job_id IN (
           SELECT js.job_id FROM JobSkills js
           INNER JOIN Skills s ON s.skill_id = js.skill_id
           WHERE s.skill_name IN (:...skills)
         )`,
        { skills },
      );
    }
  }
}

