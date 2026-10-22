import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums/domain.enum';
import { AdminLog } from './admin-log.entity';
import { Employer } from './employer.entity';
import { JobSeeker } from './job-seeker.entity';

/** User entity for credentials and authorization. */
@Entity({ name: 'Users' })
@Index('uq_users_email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'email', type: 'varchar', length: 100 })
  email!: string;

  /** Password hash digest (excluded from default queries). */
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ name: 'role', type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToOne(() => JobSeeker, (seeker) => seeker.user, {
    cascade: ['insert', 'update'],
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  seeker?: JobSeeker;

  @OneToOne(() => Employer, (employer) => employer.user, {
    cascade: ['insert', 'update'],
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  employer?: Employer;

  @OneToMany(() => AdminLog, (log) => log.admin)
  adminLogs?: AdminLog[];
}
