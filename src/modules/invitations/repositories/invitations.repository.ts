import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  FindManyOptions,
  DeepPartial,
} from 'typeorm';
import { Invitation } from '../entities/invitation.entity';
import { TenantContextService } from '../../../core/context/tenant-context.service';
import { applyTenantFilter } from '../../../core/context/tenant-filter.helper';

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectRepository(Invitation)
    private readonly repository: Repository<Invitation>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findOne(
    options: FindOneOptions<Invitation>,
  ): Promise<Invitation | null> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Invitation>): Invitation {
    return this.repository.create(data);
  }

  async save(invitation: Invitation): Promise<Invitation> {
    return this.repository.save(invitation);
  }

  async find(options: FindManyOptions<Invitation>): Promise<Invitation[]> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.find(options);
  }
}
