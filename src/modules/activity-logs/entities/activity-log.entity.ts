import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';
import { User } from '../../users/entities/user.entity';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  taskId: string;

  @Column()
  userId: string;

  @Column()
  event: string;

  @Column({ type: 'jsonb', nullable: true })
  details: {
    old?: string | number | boolean | Date | object | null;
    new?: string | number | boolean | Date | object | null;
    [key: string]: string | number | boolean | Date | object | null | undefined;
  };

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Task, (t) => t.activityLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @ManyToOne(() => User, (u) => u.activityLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
