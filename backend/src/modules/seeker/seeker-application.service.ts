import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestError,
  ConflictError,
} from '../../common/exceptions/domain.exceptions';
import { ApplicationStatus, JobStatus, normalizeSkillName } from '../../common/enums/domain.enum';
import { Application, Job, JobSeeker, JobSkill, Skill } from '../../database/entities';

export interface SeekerApplicationDto {
  application_id: number;
  status: string;
  applied_at: Date;
  title: string | null;
  company_name: string | null;
  job_id: number;
  employer_id: number;
}

export interface JobMatchDto {
  job_id: number;
  seeker_id: number;
  match_percentage: number;
  matched_skills_count: number;
  total_job_skills: number;
  matched_skills: string[];
  missing_skills: string[];
}

/** Handles seeker job applications and skill matching logic. */
@Injectable()
export class SeekerApplicationService {
  constructor(
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    @InjectRepository(JobSeeker) private readonly seekers: Repository<JobSeeker>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(JobSkill) private readonly jobSkills: Repository<JobSkill>,
  ) {}

  async apply(seekerId: number, jobId: number): Promise<{ application_id: number; seeker_id: number }> {
    const seeker = await this.seekers.findOne({ where: { seekerId } });
    if (!seeker?.resumePath) {
      throw new BadRequestError(
        'No resume found. Please upload a PDF in profile settings first.',
      );
    }

    const job = await this.jobs.findOne({ where: { jobId, status: JobStatus.OPEN, isVerified: true } });
    if (!job) {
      throw new NotFoundException('Job not found or unavailable.');
    }

    try {
      const application = await this.applications.save(
        this.applications.create({
          jobId,
          seekerId,
          status: ApplicationStatus.APPLIED,
        }),
      );

      return { application_id: application.applicationId, seeker_id: seekerId };
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError('You have already applied for this job.');
      }
      throw error;
    }
  }

  async list(seekerId: number): Promise<{ data: SeekerApplicationDto[]; count: number }> {
    const data = await this.applications
      .createQueryBuilder('a')
      .innerJoin('a.job', 'job')
      .innerJoin('job.employer', 'employer')
      .select('a.application_id', 'application_id')
      .addSelect('a.status', 'status')
      .addSelect('a.applied_at', 'applied_at')
      .addSelect('job.title', 'title')
      .addSelect('job.job_id', 'job_id')
      .addSelect('job.employer_id', 'employer_id')
      .addSelect('employer.company_name', 'company_name')
      .where('a.seeker_id = :seekerId', { seekerId })
      .orderBy('a.applied_at', 'DESC')
      .getRawMany<SeekerApplicationDto>();

    return { data, count: data.length };
  }

  async revoke(seekerId: number, applicationId: number): Promise<void> {
    const result = await this.applications.delete({ applicationId, seekerId });
    if (result.affected === 0) {
      throw new NotFoundException('Application not found.');
    }
  }

  /** Skill overlap between the seeker and an opening — the data behind the match gauge on the job detail page. */
  async jobMatch(seekerId: number, jobId: number): Promise<JobMatchDto> {
    const job = await this.jobs.findOne({ where: { jobId, status: JobStatus.OPEN, isVerified: true } });
    if (!job) {
      throw new NotFoundException('Job not found or unavailable.');
    }

    const [jobSkills, seekerSkills] = await Promise.all([
      this.loadJobSkillNames(jobId),
      this.loadSeekerSkillNames(seekerId),
    ]);

    // Both sides are normalised: `PUT /seeker/skills` stores lower-case names,
    // while rows seeded straight into `Skills` keep their display casing
    // (`Angular`). Comparing a lower-cased set against raw job names made every
    // job report 0% with all of its own skills listed as "missing".
    const seekerSet = new Set(seekerSkills.map(normalizeSkillName));
    const matched = jobSkills.filter((skill) => seekerSet.has(normalizeSkillName(skill)));
    const missing = jobSkills.filter((skill) => !seekerSet.has(normalizeSkillName(skill)));

    const percentage =
      jobSkills.length === 0 ? 100 : Number(((matched.length / jobSkills.length) * 100).toFixed(2));

    return {
      job_id: jobId,
      seeker_id: seekerId,
      match_percentage: percentage,
      matched_skills_count: matched.length,
      total_job_skills: jobSkills.length,
      matched_skills: matched,
      missing_skills: missing,
    };
  }

  private async loadJobSkillNames(jobId: number): Promise<string[]> {
    const rows = await this.jobSkills
      .createQueryBuilder('js')
      .innerJoin(Skill, 's', 's.skill_id = js.skill_id')
      .select('s.skill_name', 'skill_name')
      .where('js.job_id = :jobId', { jobId })
      .orderBy('s.skill_name', 'ASC')
      .getRawMany<{ skill_name: string }>();

    return rows.map((row) => row.skill_name);
  }

  private async loadSeekerSkillNames(seekerId: number): Promise<string[]> {
    const rows = await this.seekers
      .createQueryBuilder('seeker')
      .innerJoin('seeker.seekerSkills', 'ss')
      .innerJoin(Skill, 's', 's.skill_id = ss.skill_id')
      .select('s.skill_name', 'skill_name')
      .where('seeker.seeker_id = :seekerId', { seekerId })
      .getRawMany<{ skill_name: string }>();

    return rows.map((row) => row.skill_name);
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (error as { errno?: number })?.errno === 1062;
  }

  /** Company details behind a posting, read through the seeker's eyes. */
  async findEmployerOfJob(jobId: number): Promise<Record<string, unknown>> {
    const row = await this.jobs
      .createQueryBuilder('job')
      .innerJoin('job.employer', 'employer')
      .select('employer.employer_id', 'employer_id')
      .addSelect('employer.company_name', 'company_name')
      .addSelect('employer.company_phone', 'company_phone')
      .addSelect('employer.industry', 'industry')
      .addSelect('employer.company_size', 'company_size')
      .addSelect('employer.company_location', 'company_location')
      .addSelect('employer.company_website', 'company_website')
      .addSelect('employer.crn', 'crn')
      .addSelect('employer.profile_picture_url', 'logo_url')
      .where('job.job_id = :jobId', { jobId })
      .getRawOne<Record<string, unknown>>();

    if (!row) {
      throw new NotFoundException('Job not found.');
    }

    return row;
  }
}
