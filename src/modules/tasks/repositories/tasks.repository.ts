import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  FindManyOptions,
  DeepPartial,
  SelectQueryBuilder,
} from 'typeorm';
import { Task } from '../entities/task.entity';
import { TenantContextService } from '../../../core/context/tenant-context.service';
import { applyTenantFilter } from '../../../core/context/tenant-filter.helper';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repository: Repository<Task>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findOne(options: FindOneOptions<Task>): Promise<Task | null> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Task>): Task {
    return this.repository.create(data);
  }

  async save(task: Task): Promise<Task> {
    return this.repository.save(task);
  }

  async find(options: FindManyOptions<Task>): Promise<Task[]> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.find(options);
  }

  async softRemove(task: Task): Promise<Task> {
    return this.repository.softRemove(task);
  }

  createQueryBuilder(alias: string): SelectQueryBuilder<Task> {
    const qb = this.repository.createQueryBuilder(alias);
    const workspaceId = this.tenantContextService.getWorkspaceId();
    if (workspaceId) {
      qb.andWhere(`${alias}.workspaceId = :workspaceId`, { workspaceId });
    }
    return qb;
  }
}
