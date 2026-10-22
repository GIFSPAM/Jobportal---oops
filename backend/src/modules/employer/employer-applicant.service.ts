import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenError } from '../../common/exceptions/domain.exceptions';
import { ApplicationStatus } from '../../common/enums/domain.enum';
import { Application, Job, SeekerSkill } from '../../database/entities';
import type { ApplicantQueryDto, UpdateApplicationStatusDto } from './dto/employer.dto';
import type { ApplicantDto } from './mappers/employer-job.mapper';

/** Raw application + seeker row before skills are attached. */
interface ApplicantRow {
  application_id: number;
  application_status: ApplicationStatus;
  applied_at: Date;
  seeker_id: number;
  full_name: string | null;
  education: string | null;
  experience_years: number | null;
  phone_number: string | null;
  avatar_url: string | null;
  resume_path: string | null;
}

/** Candidate review for one employer. */
@Injectable()
export class EmployerApplicantService {
  constructor(
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(SeekerSkill) private readonly seekerSkills: Repository<SeekerSkill>,
  ) {}

  async listApplicants(
    employerId: number,
    jobId: number,
    query: ApplicantQueryDto,
  ): Promise<{ data: ApplicantDto[]; count: number }> {
    const owned = await this.jobs.findOne({ where: { jobId, employerId }, select: ['jobId'] });
    if (!owned) {
      throw new NotFoundException('Job not found.');
    }

    const rows = await this.buildQuery(jobId, query).getRawMany<ApplicantRow>();
    const skillsBySeeker = await this.loadSkills(rows.map((row) => row.seeker_id));

    const data = rows.map<ApplicantDto>((row) => ({
      application_id: row.application_id,
      application_status: row.application_status,
      applied_at: row.applied_at,
      seeker: {
        seeker_id: row.seeker_id,
        full_name: row.full_name,
        education: row.education,
        experience_years: row.experience_years,
        phone_number: row.phone_number,
        avatar_url: row.avatar_url,
        // Path only (no host): clients prefix it with their API origin, which
        // keeps the payload correct behind proxies and virtual hosts.
        resume_url: row.resume_path ? `/api/auth/resume-download/${row.application_id}` : null,
        skills: skillsBySeeker.get(row.seeker_id) ?? [],
      },
    }));

    return { data, count: data.length };
  }

  async updateApplicationStatus(
    employerId: number,
    applicationId: number,
    dto: UpdateApplicationStatusDto,
  ): Promise<void> {
    const result = await this.applications
      .createQueryBuilder()
      .update(Application)
      .set({ status: dto.status })
      .where('application_id = :applicationId', { applicationId })
      .andWhere('job_id IN (SELECT job_id FROM Jobs WHERE employer_id = :employerId)', {
        employerId,
      })
      .execute();

    if (result.affected === 0) {
      throw new ForbiddenError('Unauthorized.');
    }
  }

  private buildQuery(jobId: number, query: ApplicantQueryDto) {
    const qb = this.applications
      .createQueryBuilder('a')
      .innerJoin('a.seeker', 'seeker')
      .select('a.application_id', 'application_id')
      .addSelect('a.status', 'application_status')
      .addSelect('a.applied_at', 'applied_at')
      .addSelect('seeker.seeker_id', 'seeker_id')
      .addSelect('seeker.full_name', 'full_name')
      .addSelect('seeker.education', 'education')
      .addSelect('seeker.experience_years', 'experience_years')
      .addSelect('seeker.phone_number', 'phone_number')
      .addSelect('seeker.profile_picture_url', 'avatar_url')
      .addSelect('seeker.resume_path', 'resume_path')
      .where('a.job_id = :jobId', { jobId });

    if (query.sort_by === 'experience') {
      qb.orderBy('seeker.experience_years', 'DESC');
    } else {
      qb.orderBy('a.applied_at', 'DESC');
    }

    if (query.skill_name?.trim()) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM SeekerSkills fs JOIN Skills fsk ON fsk.skill_id = fs.skill_id
                 WHERE fs.seeker_id = seeker.seeker_id AND fsk.skill_name = :skillName)`,
        { skillName: query.skill_name.trim().toLowerCase() },
      );
    }

    if (query.proficiency?.trim()) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM SeekerSkills ps
                 WHERE ps.seeker_id = seeker.seeker_id AND ps.proficiency = :proficiency)`,
        { proficiency: query.proficiency.trim().toLowerCase() },
      );
    }

    return qb;
  }

  /** One query for every seeker, then grouped in memory — no N+1 round trips. */
  private async loadSkills(seekerIds: number[]): Promise<Map<number, { name: string; proficiency: string }[]>> {
    const grouped = new Map<number, { name: string; proficiency: string }[]>();
    if (seekerIds.length === 0) return grouped;

    const rows = await this.seekerSkills
      .createQueryBuilder('ss')
      .innerJoin('ss.skill', 'skill')
      .select('ss.seeker_id', 'seeker_id')
      .addSelect('skill.skill_name', 'name')
      .addSelect('ss.proficiency', 'proficiency')
      .where('ss.seeker_id IN (:...seekerIds)', { seekerIds })
      .orderBy('skill.skill_name', 'ASC')
      .getRawMany<{ seeker_id: number; name: string; proficiency: string }>();

    for (const row of rows) {
      const list = grouped.get(row.seeker_id) ?? [];
      list.push({ name: row.name, proficiency: row.proficiency });
      grouped.set(row.seeker_id, list);
    }

    return grouped;
  }
}
