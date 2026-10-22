import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ApplicationStatus,
  JobStatus,
  UserRole,
} from '../../common/enums/domain.enum';
import { BadRequestError, NotFoundError } from '../../common/exceptions/domain.exceptions';
import {
  AdminLog,
  Application,
  Employer,
  Job,
  JobSeeker,
  User,
} from '../../database/entities';
import { csvToSkills, skillsCsvSubquery } from '../../database/sql';
import type { AdminJobsQueryDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(AdminLog) private readonly logs: Repository<AdminLog>,
    @InjectRepository(Employer) private readonly employers: Repository<Employer>,
    @InjectRepository(JobSeeker) private readonly seekers: Repository<JobSeeker>,
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    private readonly dataSource: DataSource,
  ) {}

  async stats() {
    const [
      totalUsers,
      totalEmployers,
      totalSeekers,
      totalJobs,
      verifiedJobs,
      openJobs,
      totalApplications,
      applied,
      shortlisted,
      rejected,
      hired,
    ] = await Promise.all([
      this.users.count({ where: [{ role: UserRole.EMPLOYER }, { role: UserRole.JOBSEEKER }] }),
      this.users.count({ where: { role: UserRole.EMPLOYER } }),
      this.users.count({ where: { role: UserRole.JOBSEEKER } }),
      this.jobs.count(),
      this.jobs.count({ where: { isVerified: true } }),
      this.jobs.count({ where: { status: JobStatus.OPEN } }),
      this.applications.count(),
      this.applications.count({ where: { status: ApplicationStatus.APPLIED } }),
      this.applications.count({ where: { status: ApplicationStatus.SHORTLISTED } }),
      this.applications.count({ where: { status: ApplicationStatus.REJECTED } }),
      this.applications.count({ where: { status: ApplicationStatus.HIRED } }),
    ]);

    return {
      users: { total: totalUsers, employers: totalEmployers, seekers: totalSeekers },
      jobs: { total: totalJobs, verified: verifiedJobs, open: openJobs },
      applications: { total: totalApplications, applied, shortlisted, rejected, hired },
    };
  }

  async listJobs(query: AdminJobsQueryDto) {
    const qb = this.jobs
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
      .addSelect('j.posted_at', 'posted_at')
      .addSelect('j.salary_min', 'salary_min')
      .addSelect('j.salary_max', 'salary_max')
      .addSelect('e.company_name', 'company_name')
      .addSelect('e.profile_picture_url', 'profile_picture_url')
      .addSelect(skillsCsvSubquery('j'), 'skills_list');

    if (query.search) {
      qb.andWhere('j.title LIKE :search', { search: `%${query.search}%` });
    }
    if (query.location) {
      qb.andWhere('j.location = :location', { location: query.location });
    }
    if (query.job_type) {
      qb.andWhere('j.job_type = :jobType', { jobType: query.job_type });
    }
    if (query.status) {
      qb.andWhere('j.status = :status', { status: query.status });
    }
    if (query.is_verified === 'true' || query.is_verified === 'false') {
      qb.andWhere('j.is_verified = :verified', { verified: query.is_verified === 'true' ? 1 : 0 });
    }
    if (query.skills) {
      const names = query.skills
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean);
      if (names.length) {
        qb.andWhere(
          `j.job_id IN (
            SELECT js.job_id FROM JobSkills js
            JOIN Skills s ON js.skill_id = s.skill_id
            WHERE s.skill_name IN (:...skillNames)
          )`,
          { skillNames: names },
        );
      }
    }

    qb.orderBy(query.sort_by === 'salary' ? 'j.salary_max' : 'j.posted_at', 'DESC');
    const rows = await qb.getRawMany<Record<string, unknown>>();

    const data = rows.map((row) => ({
      job_id: Number(row.job_id),
      employer_id: Number(row.employer_id),
      title: row.title,
      description: row.description,
      location: row.location,
      job_type: row.job_type,
      status: row.status,
      is_verified: Boolean(Number(row.is_verified)),
      posted_at: row.posted_at,
      salary_min: row.salary_min === null ? null : Number(row.salary_min),
      salary_max: row.salary_max === null ? null : Number(row.salary_max),
      company_name: row.company_name,
      profile_picture_url: row.profile_picture_url,
      skills: csvToSkills(row.skills_list as string | null),
    }));

    return { data, count: data.length };
  }

  async listUsers() {
    const rows = await this.users
      .createQueryBuilder('u')
      .leftJoin(JobSeeker, 'js', 'js.seeker_id = u.user_id')
      .leftJoin(Employer, 'e', 'e.employer_id = u.user_id')
      .select('u.user_id', 'user_id')
      .addSelect('u.email', 'email')
      .addSelect('u.role', 'role')
      .addSelect('u.is_active', 'is_active')
      .addSelect('u.created_at', 'created_at')
      .addSelect('js.full_name', 'full_name')
      .addSelect('e.company_name', 'company_name')
      .addSelect('e.company_website', 'company_website')
      .orderBy('u.created_at', 'DESC')
      .getRawMany<Record<string, unknown>>();

    return rows.map((row) => ({
      ...row,
      user_id: Number(row.user_id),
      is_active: Boolean(Number(row.is_active)),
    }));
  }

  async getUser(userId: number) {
    const row = await this.users
      .createQueryBuilder('u')
      .leftJoin(JobSeeker, 'js', 'js.seeker_id = u.user_id')
      .leftJoin(Employer, 'e', 'e.employer_id = u.user_id')
      .select('u.user_id', 'user_id')
      .addSelect('u.email', 'email')
      .addSelect('u.role', 'role')
      .addSelect('u.is_active', 'is_active')
      .addSelect('u.created_at', 'created_at')
      .addSelect('js.full_name', 'full_name')
      .addSelect('js.phone_number', 'phone_number')
      .addSelect('js.education', 'education')
      .addSelect('js.experience_years', 'experience_years')
      .addSelect('js.profile_picture_url', 'seeker_profile_picture_url')
      .addSelect('e.company_name', 'company_name')
      .addSelect('e.company_phone', 'company_phone')
      .addSelect('e.industry', 'industry')
      .addSelect('e.company_size', 'company_size')
      .addSelect('e.company_location', 'company_location')
      .addSelect('e.company_website', 'company_website')
      .addSelect('e.profile_picture_url', 'employer_profile_picture_url')
      .where('u.user_id = :userId', { userId })
      .getRawOne<Record<string, unknown>>();

    if (!row) throw new NotFoundError('User not found.');
    return { ...row, user_id: Number(row.user_id), is_active: Boolean(Number(row.is_active)) };
  }

  async updateUserStatus(adminId: number, userId: number, isActive: boolean): Promise<void> {
    if (userId === adminId && !isActive) {
      throw new BadRequestError('Admin cannot deactivate own account.');
    }
    const result = await this.users.update({ userId }, { isActive });
    if (!result.affected) throw new NotFoundError('User not found.');
    await this.log(
      adminId,
      isActive ? `Activated user ${userId}` : `Deactivated user ${userId}`,
      'users',
      userId,
    );
  }

  async deleteUser(adminId: number, userId: number): Promise<void> {
    if (userId === adminId) {
      throw new BadRequestError('Admin cannot delete own account.');
    }
    const result = await this.users.delete({ userId });
    if (!result.affected) throw new NotFoundError('User not found.');
    await this.log(adminId, `Deleted user ${userId}`, 'users', userId);
  }

  async listEmployers() {
    const rows = await this.dataSource.query(
      `SELECT u.user_id, u.email, u.is_active, u.created_at, e.company_name, e.industry,
              e.company_size, e.company_location, e.company_website, e.company_phone,
              COUNT(j.job_id) AS total_jobs
       FROM Users u
       JOIN Employers e ON e.employer_id = u.user_id
       LEFT JOIN Jobs j ON j.employer_id = u.user_id
       GROUP BY u.user_id
       ORDER BY u.created_at DESC`,
    );
    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      user_id: Number(row.user_id),
      total_jobs: Number(row.total_jobs),
      is_active: Boolean(Number(row.is_active)),
    }));
  }

  async listSeekers() {
    const rows = await this.dataSource.query(
      `SELECT u.user_id, u.email, u.is_active, u.created_at, js.full_name, js.phone_number,
              js.education, js.experience_years, COUNT(a.application_id) AS total_applications
       FROM Users u
       JOIN JobSeekers js ON js.seeker_id = u.user_id
       LEFT JOIN Applications a ON a.seeker_id = u.user_id
       GROUP BY u.user_id
       ORDER BY u.created_at DESC`,
    );
    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      user_id: Number(row.user_id),
      total_applications: Number(row.total_applications),
      is_active: Boolean(Number(row.is_active)),
    }));
  }

  async verifyJob(adminId: number, jobId: number): Promise<void> {
    const result = await this.jobs.update(
      { jobId },
      { isVerified: true, verifiedBy: adminId, verifiedAt: new Date() },
    );
    if (!result.affected) throw new NotFoundError('Job not found.');
    await this.log(adminId, `Verified job ID ${jobId}`, 'jobs', jobId);
  }

  async unverifyJob(adminId: number, jobId: number): Promise<void> {
    const result = await this.jobs.update(
      { jobId },
      { isVerified: false, verifiedBy: null, verifiedAt: null },
    );
    if (!result.affected) throw new NotFoundError('Job not found.');
    await this.log(adminId, `Unverified job ID ${jobId}`, 'jobs', jobId);
  }

  async deleteJob(adminId: number, jobId: number): Promise<void> {
    const result = await this.jobs.delete({ jobId });
    if (!result.affected) throw new NotFoundError('Job not found.');
    await this.log(adminId, `Deleted job ID ${jobId}`, 'jobs', jobId);
  }

  async listLogs() {
    return this.logs
      .createQueryBuilder('al')
      .innerJoin(User, 'u', 'u.user_id = al.admin_id')
      .select('al.log_id', 'log_id')
      .addSelect('al.admin_id', 'admin_id')
      .addSelect('al.action_type', 'action_type')
      .addSelect('al.target_table', 'target_table')
      .addSelect('al.target_id', 'target_id')
      .addSelect('al.action_time', 'action_time')
      .addSelect('u.email', 'admin_email')
      .orderBy('al.action_time', 'DESC')
      .getRawMany();
  }

  private async log(adminId: number, actionType: string, targetTable: string, targetId: number) {
    await this.logs.save(this.logs.create({ adminId, actionType, targetTable, targetId }));
  }
}
