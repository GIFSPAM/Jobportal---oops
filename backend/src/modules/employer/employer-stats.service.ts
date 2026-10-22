import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApplicationStatus,
  JobStatus,
} from '../../common/enums/domain.enum';
import { Application, Job } from '../../database/entities';

export interface EmployerStatsDto {
  total_jobs: number;
  open_jobs: number;
  closed_jobs: number;
  verified_jobs: number;
  total_applications: number;
  applications_by_status: Record<ApplicationStatus, number>;
}

/** Aggregated counters for one employer's dashboard. */
@Injectable()
export class EmployerStatsService {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Application) private readonly applications: Repository<Application>,
  ) {}

  async stats(employerId: number): Promise<EmployerStatsDto> {
    const [base, openJobs, closedJobs, verifiedJobs, applicationRows] = await Promise.all([
      this.jobs.count({ where: { employerId } }),
      this.jobs.count({ where: { employerId, status: JobStatus.OPEN } }),
      this.jobs.count({ where: { employerId, status: JobStatus.CLOSED } }),
      this.jobs.count({ where: { employerId, isVerified: true } }),
      this.applications
        .createQueryBuilder('a')
        .innerJoin('a.job', 'job')
        .select('a.status', 'status')
        .addSelect('COUNT(*)', 'total')
        .where('job.employer_id = :employerId', { employerId })
        .groupBy('a.status')
        .getRawMany<{ status: ApplicationStatus; total: string }>(),
    ]);

    const byStatus: Record<ApplicationStatus, number> = {
      [ApplicationStatus.APPLIED]: 0,
      [ApplicationStatus.SHORTLISTED]: 0,
      [ApplicationStatus.REJECTED]: 0,
      [ApplicationStatus.HIRED]: 0,
    };

    let totalApplications = 0;
    for (const row of applicationRows) {
      const total = Number(row.total);
      byStatus[row.status] = total;
      totalApplications += total;
    }

    return {
      total_jobs: base,
      open_jobs: openJobs,
      closed_jobs: closedJobs,
      verified_jobs: verifiedJobs,
      total_applications: totalApplications,
      applications_by_status: byStatus,
    };
  }
}
