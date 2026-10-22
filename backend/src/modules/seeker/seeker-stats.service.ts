import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationStatus } from '../../common/enums/domain.enum';
import { Application, JobSeeker, SavedJob, SeekerSkill } from '../../database/entities';

export interface SeekerStatsDto {
  total_applications: number;
  applications_by_status: Record<ApplicationStatus, number>;
  saved_jobs: number;
  skills_count: number;
}

/** Dashboard counters for one seeker. */
@Injectable()
export class SeekerStatsService {
  constructor(
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    @InjectRepository(JobSeeker) private readonly seekers: Repository<JobSeeker>,
    @InjectRepository(SavedJob) private readonly savedJobs: Repository<SavedJob>,
    @InjectRepository(SeekerSkill) private readonly seekerSkills: Repository<SeekerSkill>,
  ) {}

  async stats(seekerId: number): Promise<SeekerStatsDto> {
    const seeker = await this.seekers.findOne({ where: { seekerId } });
    if (!seeker) {
      throw new NotFoundException('Profile not found.');
    }

    const [byStatus, totalApplications, savedJobs, skillsCount] = await Promise.all([
      this.countApplicationsByStatus(seekerId),
      this.applications.count({ where: { seekerId } }),
      this.savedJobs.count({ where: { seekerId } }),
      this.seekerSkills.count({ where: { seekerId } }),
    ]);

    return {
      total_applications: totalApplications,
      applications_by_status: byStatus,
      saved_jobs: savedJobs,
      skills_count: skillsCount,
    };
  }

  /** Always returns all four keys so the UI never has to guard for `undefined`. */
  private async countApplicationsByStatus(
    seekerId: number,
  ): Promise<Record<ApplicationStatus, number>> {
    const counts: Record<ApplicationStatus, number> = {
      [ApplicationStatus.APPLIED]: 0,
      [ApplicationStatus.SHORTLISTED]: 0,
      [ApplicationStatus.REJECTED]: 0,
      [ApplicationStatus.HIRED]: 0,
    };

    const rows = await this.applications
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .where('a.seeker_id = :seekerId', { seekerId })
      .groupBy('a.status')
      .getRawMany<{ status: ApplicationStatus; total: string }>();

    for (const row of rows) {
      counts[row.status] = Number(row.total);
    }

    return counts;
  }
}
