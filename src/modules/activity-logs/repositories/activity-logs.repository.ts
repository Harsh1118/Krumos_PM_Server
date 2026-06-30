import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  DeepPartial,
  SelectQueryBuilder,
} from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';

@Injectable()
export class ActivityLogsRepository {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repository: Repository<ActivityLog>,
  ) {}

  create(data: DeepPartial<ActivityLog>): ActivityLog {
    return this.repository.create(data);
  }

  async save(logEntry: ActivityLog): Promise<ActivityLog> {
    return this.repository.save(logEntry);
  }

  async find(options: FindManyOptions<ActivityLog>): Promise<ActivityLog[]> {
    return this.repository.find(options);
  }

  createQueryBuilder(alias: string): SelectQueryBuilder<ActivityLog> {
    return this.repository.createQueryBuilder(alias);
  }
}
