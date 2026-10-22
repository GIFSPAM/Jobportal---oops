import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Application } from './application.entity';
import { SavedJob } from './saved-job.entity';
import { SeekerSkill } from './seeker-skill.entity';

/** Job-seeker profile. Shares its primary key with {@link User} (1:1). */
@Entity({ name: 'JobSeekers' })
export class JobSeeker {
  @PrimaryColumn({ name: 'seeker_id' })
  seekerId!: number;

  @OneToOne(() => User, (user) => user.seeker, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seeker_id' })
  user!: User;

  @Column({ name: 'full_name', type: 'varchar', length: 100, nullable: true })
  fullName!: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'education', type: 'varchar', length: 100, nullable: true })
  education!: string | null;

  @Column({ name: 'experience_years', type: 'int', nullable: true })
  experienceYears!: number | null;

  @Column({ name: 'resume_path', type: 'varchar', length: 255, nullable: true })
  resumePath!: string | null;

  @Column({ name: 'resume_filename', type: 'varchar', length: 255, nullable: true })
  resumeFilename!: string | null;

  @Column({ name: 'profile_picture_url', type: 'varchar', length: 500, nullable: true })
  profilePictureUrl!: string | null;

  @OneToMany(() => SeekerSkill, (skill) => skill.seeker, { cascade: true })
  seekerSkills?: SeekerSkill[];

  @OneToMany(() => Application, (application) => application.seeker)
  applications?: Application[];

  @OneToMany(() => SavedJob, (saved) => saved.seeker, { cascade: true })
  savedJobs?: SavedJob[];
}
