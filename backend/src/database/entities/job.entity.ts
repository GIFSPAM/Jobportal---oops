import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobStatus, JobType } from '../../common/enums/domain.enum';
import { Application } from './application.entity';
import { Employer } from './employer.entity';
import { JobSkill } from './job-skill.entity';
import { SavedJob } from './saved-job.entity';

/** A job opening published by an employer and moderated by an admin. */
@Entity({ name: 'Jobs' })
@Index('idx_jobs_employer', ['employerId'])
export class Job {
  @PrimaryGeneratedColumn({ name: 'job_id' })
  jobId!: number;

  @Column({ name: 'employer_id' })
  employerId!: number;

  @ManyToOne(() => Employer, (employer) => employer.jobs, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'employer_id' })
  employer!: Employer;

  @Column({ name: 'title', type: 'varchar', length: 100, nullable: true })
  title!: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'location', type: 'varchar', length: 100, nullable: true })
  location!: string | null;

  @Column({ name: 'job_type', type: 'enum', enum: JobType, nullable: true })
  jobType!: JobType | null;

  @Column({ name: 'salary_min', type: 'int', nullable: true })
  salaryMin!: number | null;

  @Column({ name: 'salary_max', type: 'int', nullable: true })
  salaryMax!: number | null;

  @Column({ name: 'application_count', type: 'int', default: 0 })
  applicationCount!: number;

  @Column({ name: 'status', type: 'enum', enum: JobStatus, default: JobStatus.OPEN })
  status!: JobStatus;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ name: 'verified_by', type: 'int', nullable: true })
  verifiedBy!: number | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  @Column({
    name: 'posted_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  postedAt!: Date;

  @OneToMany(() => JobSkill, (jobSkill) => jobSkill.job, { cascade: true })
  jobSkills?: JobSkill[];

  @OneToMany(() => Application, (application) => application.job)
  applications?: Application[];

  @OneToMany(() => SavedJob, (saved) => saved.job, { cascade: true })
  savedBy?: SavedJob[];
}
