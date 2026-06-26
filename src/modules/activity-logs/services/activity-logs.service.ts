import { Injectable } from '@nestjs/common';
import { ActivityLogsRepository } from '../repositories/activity-logs.repository';
import { ActivityLog } from '../entities/activity-log.entity';

@Injectable()
export class ActivityLogsService {
  constructor(
    private readonly activityLogsRepository: ActivityLogsRepository,
  ) {}

  async log(
    taskId: string,
    userId: string,
    event: string,
    details?: {
      old?: string | number | boolean | Date | object | null;
      new?: string | number | boolean | Date | object | null;
      [key: string]: string | number | boolean | Date | object | null | undefined;
    },
  ): Promise<ActivityLog> {
    const logEntry = this.activityLogsRepository.create({
      taskId,
      userId,
      event,
      details,
    });
    return this.activityLogsRepository.save(logEntry);
  }

  async findAllForTask(taskId: string): Promise<ActivityLog[]> {
    return this.activityLogsRepository.find({
      where: { taskId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }
}
