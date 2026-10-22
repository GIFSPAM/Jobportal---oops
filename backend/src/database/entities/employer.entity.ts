import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { CompanySize } from '../../common/enums/domain.enum';
import { Job } from './job.entity';
import { User } from './user.entity';

/** Employer profile. Shares its primary key with {@link User} (1:1). */
@Entity({ name: 'Employers' })
export class Employer {
  @PrimaryColumn({ name: 'employer_id' })
  employerId!: number;

  @OneToOne(() => User, (user) => user.employer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employer_id' })
  user!: User;

  @Column({ name: 'company_name', type: 'varchar', length: 100, nullable: true })
  companyName!: string | null;

  @Column({ name: 'company_phone', type: 'varchar', length: 20, nullable: true })
  companyPhone!: string | null;

  @Column({ name: 'industry', type: 'varchar', length: 100, nullable: true })
  industry!: string | null;

  @Column({
    name: 'company_size',
    type: 'enum',
    enum: CompanySize,
    nullable: true,
  })
  companySize!: CompanySize | null;

  @Column({ name: 'company_location', type: 'varchar', length: 100, nullable: true })
  companyLocation!: string | null;

  @Column({ name: 'company_website', type: 'varchar', length: 150, nullable: true })
  companyWebsite!: string | null;

  @Column({ name: 'profile_picture_url', type: 'varchar', length: 500, nullable: true })
  profilePictureUrl!: string | null;

  @OneToMany(() => Job, (job) => job.employer)
  jobs?: Job[];
}
