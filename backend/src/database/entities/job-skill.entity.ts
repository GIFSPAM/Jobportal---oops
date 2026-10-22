import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Job } from './job.entity';
import { Skill } from './skill.entity';

/** Many-to-many: which skills a posted job requires. */
@Entity({ name: 'JobSkills' })
export class JobSkill {
  @PrimaryColumn({ name: 'job_id' })
  jobId!: number;

  @PrimaryColumn({ name: 'skill_id' })
  skillId!: number;

  @ManyToOne(() => Job, (job) => job.jobSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job;

  @ManyToOne(() => Skill, (skill) => skill.jobSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill!: Skill;
}
