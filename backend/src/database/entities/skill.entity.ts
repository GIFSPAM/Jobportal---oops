import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JobSkill } from './job-skill.entity';
import { SeekerSkill } from './seeker-skill.entity';

/** Normalised skill vocabulary shared by jobs and seekers. */
@Entity({ name: 'Skills' })
@Index('idx_skill_name', ['skillName'], { unique: true })
export class Skill {
  @PrimaryGeneratedColumn({ name: 'skill_id' })
  skillId!: number;

  @Column({ name: 'skill_name', type: 'varchar', length: 50 })
  skillName!: string;

  @OneToMany(() => JobSkill, (jobSkill) => jobSkill.skill, { cascade: true })
  jobSkills?: JobSkill[];

  @OneToMany(() => SeekerSkill, (seekerSkill) => seekerSkill.skill, { cascade: true })
  seekerSkills?: SeekerSkill[];
}
