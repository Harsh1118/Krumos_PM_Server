import { ActivityLog } from '../entities/activity-log.entity';
import { UserMinResponseDto } from '../../users/mappers/user.mapper';

export interface ActivityLogDetails {
  old?: string | number | boolean | Date | object | null;
  new?: string | number | boolean | Date | object | null;
  [key: string]: string | number | boolean | Date | object | null | undefined;
}

export interface ActivityLogResponseDto {
  id: string;
  user: UserMinResponseDto;
  taskId: string;
  taskTitle: string;
  event: string;
  details: ActivityLogDetails | null;
  createdAt: Date;
}

export const mapActivityLogToResponse = (log: ActivityLog): ActivityLogResponseDto => ({
  id: log.id,
  user: {
    id: log.user.id,
    name: log.user.name,
    avatarUrl: log.user.avatarUrl,
  },
  taskId: log.taskId,
  taskTitle: log.task?.title || 'Deleted Task',
  event: log.event,
  details: log.details,
  createdAt: log.createdAt,
});
