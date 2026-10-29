import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../common/exceptions/domain.exceptions';
import { JobStatus } from '../../common/enums/domain.enum';
import { Employer, Job, JobSkill, Skill } from '../../database/entities';
import { skillsCsvSubquery } from '../../database/sql';
import type { CreateJobDto, UpdateJobDto } from './dto/employer.dto';
import { toEmployerJobDto, normalizeSkillInput, type EmployerJobDto } from './mappers/employer-job.mapper';
import { normalizeJobType } from './mappers/job-type.mapper';

/** Lifecycle of a posting owned by one employer. */
@Injectable()
export class EmployerJobService {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    private readonly dataSource: DataSource,
  ) {}

  async create(employerId: number, dto: CreateJobDto): Promise<number> {
    const employer = await this.dataSource.getRepository(Employer).findOne({ where: { employerId } });
    if (!employer?.crn || !employer.crn.trim()) {
      throw new BadRequestError(
        'Company Registration Number (CRN) is mandatory before posting jobs. Please update your CRN in your company profile.',
      );
    }

    const skills = normalizeSkillInput(dto.skills);

    const job = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(Job, {
        employerId,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        jobType: normalizeJobType(dto.job_type),
        salaryMin: dto.salary_min ?? null,
        salaryMax: dto.salary_max ?? null,
        status: JobStatus.OPEN,
        isVerified: false,
      });

      await this.replaceSkills(manager, created.jobId, skills);
      return created;
    });

    return job.jobId;
  }

  async listMine(employerId: number): Promise<{ data: EmployerJobDto[]; count: number }> {
    const rows = await this.jobs
      .createQueryBuilder('j')
      .innerJoin(Employer, 'e', 'e.employer_id = j.employer_id')
      .select('j.job_id', 'job_id')
      .addSelect('j.employer_id', 'employer_id')
      .addSelect('j.title', 'title')
      .addSelect('j.description', 'description')
      .addSelect('j.location', 'location')
      .addSelect('j.job_type', 'job_type')
      .addSelect('j.status', 'status')
      .addSelect('j.is_verified', 'is_verified')
      .addSelect('j.verified_by', 'verified_by')
      .addSelect('j.verified_at', 'verified_at')
      .addSelect('j.posted_at', 'posted_at')
      .addSelect('j.salary_min', 'salary_min')
      .addSelect('j.salary_max', 'salary_max')
      .addSelect('e.crn', 'crn')
      .addSelect(
        `(SELECT COUNT(*) FROM Applications a WHERE a.job_id = j.job_id)`,
        'applicant_count',
      )
      .addSelect(skillsCsvSubquery('j'), 'skills_list')
      .where('j.employer_id = :employerId', { employerId })
      .orderBy('j.posted_at', 'DESC')
      .getRawMany<Record<string, unknown>>();

    const data = rows.map(toEmployerJobDto);
    return { data, count: data.length };
  }

  async update(employerId: number, jobId: number, dto: UpdateJobDto): Promise<void> {
    const patch = this.buildPatch(dto);

    if (Object.keys(patch).length > 0) {
      const result = await this.jobs.update({ jobId, employerId }, patch);
      if (result.affected === 0) {
        throw new NotFoundError('Job not found.');
      }
    } else if (dto.skills === undefined) {
      throw new BadRequestError('No valid fields provided for update.');
    }

    if (dto.skills !== undefined) {
      const skills = normalizeSkillInput(dto.skills);
      await this.dataSource.transaction(async (manager) => {
        await this.replaceSkills(manager, jobId, skills);
      });
    }
  }

  async updateStatus(employerId: number, jobId: number, status: JobStatus): Promise<void> {
    const result = await this.jobs.update({ jobId, employerId }, { status });
    if (result.affected === 0) {
      throw new NotFoundError('Unauthorized.');
    }
  }

  async remove(employerId: number, jobId: number): Promise<void> {
    const job = await this.jobs.findOne({ where: { jobId }, select: ['jobId', 'employerId'] });

    if (!job) {
      throw new NotFoundError('Job not found.');
    }
    if (job.employerId !== employerId) {
      throw new ForbiddenError('Not authorized to delete this job.');
    }

    await this.jobs.delete({ jobId });
  }

  private buildPatch(dto: UpdateJobDto): Record<string, unknown> {
    const patch: Record<string, unknown> = {};

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.location !== undefined) patch.location = dto.location;
    if (dto.salary_min !== undefined) patch.salaryMin = dto.salary_min;
    if (dto.salary_max !== undefined) patch.salaryMax = dto.salary_max;
    if (dto.job_type !== undefined) patch.jobType = normalizeJobType(dto.job_type);

    return patch;
  }

  /** Skills are a set-valued attribute: they are replaced wholesale rather than merged, because "the skills this job requires" is a single declaration. */
  private async replaceSkills(
    manager: Repository<Job>['manager'],
    jobId: number,
    skillNames: string[],
  ): Promise<void> {
    await manager.delete(JobSkill, { jobId });

    for (const name of skillNames) {
      const skill = await this.findOrCreateSkill(manager, name);
      await manager.insert(JobSkill, { jobId, skillId: skill.skillId });
    }
  }

  private async findOrCreateSkill(
    manager: Repository<Job>['manager'],
    name: string,
  ): Promise<Skill> {
    const existing = await manager
      .getRepository(Skill)
      .createQueryBuilder('s')
      .where('s.skill_name = :name', { name })
      .getOne();

    if (existing) return existing;

    try {
      return await manager.save(Skill, { skillName: name });
    } catch (error) {
      // Concurrent registration of the same skill — re-read the winner's row.
      if ((error as { errno?: number })?.errno === 1062) {
        const raced = await manager
          .getRepository(Skill)
          .createQueryBuilder('s')
          .where('s.skill_name = :name', { name })
          .getOne();
        if (raced) return raced;
      }
      throw error;
    }
  }
}
