import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

/** Append-only trail of administrative moderation actions. */
@Entity({ name: 'AdminLogs' })
@Index('idx_admin_logs_admin', ['adminId'])
export class AdminLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId!: number;

  @Column({ name: 'admin_id' })
  adminId!: number;

  @Column({ name: 'action_type', type: 'varchar', length: 50, nullable: true })
  actionType!: string | null;

  @Column({ name: 'target_table', type: 'varchar', length: 50, nullable: true })
  targetTable!: string | null;

  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId!: number | null;

  @Column({
    name: 'action_time',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  actionTime!: Date;

  @ManyToOne(() => User, (user) => user.adminLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin!: User;
}
