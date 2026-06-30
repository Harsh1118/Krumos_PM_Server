import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  FindManyOptions,
  DeepPartial,
} from 'typeorm';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { TenantContextService } from '../../../core/context/tenant-context.service';
import { applyTenantFilter } from '../../../core/context/tenant-filter.helper';

@Injectable()
export class WorkspaceMembersRepository {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly repository: Repository<WorkspaceMember>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findOne(
    options: FindOneOptions<WorkspaceMember>,
  ): Promise<WorkspaceMember | null> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<WorkspaceMember>): WorkspaceMember {
    return this.repository.create(data);
  }

  async save(member: WorkspaceMember): Promise<WorkspaceMember> {
    return this.repository.save(member);
  }

  async find(
    options: FindManyOptions<WorkspaceMember>,
  ): Promise<WorkspaceMember[]> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.find(options);
  }

  async count(options: FindManyOptions<WorkspaceMember>): Promise<number> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.count(options);
  }

  async remove(member: WorkspaceMember): Promise<WorkspaceMember> {
    return this.repository.remove(member);
  }
}
