import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  FindManyOptions,
  DeepPartial,
  UpdateResult,
  DeleteResult,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Notification } from '../entities/notification.entity';
import { TenantContextService } from '../../../core/context/tenant-context.service';
import { applyTenantFilter } from '../../../core/context/tenant-filter.helper';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  create(data: DeepPartial<Notification>): Notification {
    return this.repository.create(data);
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repository.save(notification);
  }

  async find(options: FindManyOptions<Notification>): Promise<Notification[]> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.find(options);
  }

  async findOne(
    options: FindOneOptions<Notification>,
  ): Promise<Notification | null> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.findOne(options);
  }

  async update(
    criteria: any,
    partialEntity: QueryDeepPartialEntity<Notification>,
  ): Promise<UpdateResult> {
    const workspaceId = this.tenantContextService.getWorkspaceId();
    if (workspaceId && typeof criteria === 'object' && criteria !== null) {
      criteria = { ...criteria, workspaceId };
    }
    return this.repository.update(criteria, partialEntity);
  }

  async delete(criteria: any): Promise<DeleteResult> {
    const workspaceId = this.tenantContextService.getWorkspaceId();
    if (workspaceId && typeof criteria === 'object' && criteria !== null) {
      criteria = { ...criteria, workspaceId };
    }
    return this.repository.delete(criteria);
  }
}
