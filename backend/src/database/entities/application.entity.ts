import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApplicationStatus } from '../../common/enums/domain.enum';
import { Job } from './job.entity';
import { JobSeeker } from './job-seeker.entity';

/** Join record between a seeker and a job they applied to. */
@Entity({ name: 'Applications' })
@Index('uq_applications_job_seeker', ['jobId', 'seekerId'], { unique: true })
@Index('idx_applications_job', ['jobId'])
@Index('idx_applications_seeker', ['seekerId'])
export class Application {
  @PrimaryGeneratedColumn({ name: 'application_id' })
  applicationId!: number;

  @Column({ name: 'job_id' })
  jobId!: number;

  @Column({ name: 'seeker_id' })
  seekerId!: number;

  @Column({ name: 'status', type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  status!: ApplicationStatus;

  @Column({
    name: 'applied_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  appliedAt!: Date;

  @ManyToOne(() => Job, (job) => job.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job;

  @ManyToOne(() => JobSeeker, (seeker) => seeker.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seeker_id' })
  seeker!: JobSeeker;
}
