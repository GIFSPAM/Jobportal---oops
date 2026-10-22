import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SkillProficiency } from '../../common/enums/domain.enum';
import { JobSeeker } from './job-seeker.entity';
import { Skill } from './skill.entity';

/** Many-to-many with attribute: a seeker's skill and how strong it is. */
@Entity({ name: 'SeekerSkills' })
export class SeekerSkill {
  @PrimaryColumn({ name: 'seeker_id' })
  seekerId!: number;

  @PrimaryColumn({ name: 'skill_id' })
  skillId!: number;

  @Column({
    name: 'proficiency',
    type: 'enum',
    enum: SkillProficiency,
    default: SkillProficiency.BEGINNER,
  })
  proficiency!: SkillProficiency;

  @ManyToOne(() => JobSeeker, (seeker) => seeker.seekerSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seeker_id' })
  seeker!: JobSeeker;

  @ManyToOne(() => Skill, (skill) => skill.seekerSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill!: Skill;
}
