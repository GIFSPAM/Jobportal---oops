import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Job } from './job.entity';
import { JobSeeker } from './job-seeker.entity';

/** Many-to-many: jobs a seeker bookmarked. */
@Entity({ name: 'SavedJobs' })
export class SavedJob {
  @PrimaryColumn({ name: 'seeker_id' })
  seekerId!: number;

  @PrimaryColumn({ name: 'job_id' })
  jobId!: number;

  @Column({
    name: 'saved_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  savedAt!: Date;

  @ManyToOne(() => JobSeeker, (seeker) => seeker.savedJobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seeker_id' })
  seeker!: JobSeeker;

  @ManyToOne(() => Job, (job) => job.savedBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job;
}
