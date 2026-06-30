import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  FindManyOptions,
  DeepPartial,
} from 'typeorm';
import { Project } from '../entities/project.entity';
import { TenantContextService } from '../../../core/context/tenant-context.service';
import { applyTenantFilter } from '../../../core/context/tenant-filter.helper';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repository: Repository<Project>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findOne(options: FindOneOptions<Project>): Promise<Project | null> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Project>): Project {
    return this.repository.create(data);
  }

  async save(project: Project): Promise<Project> {
    return this.repository.save(project);
  }

  async find(options: FindManyOptions<Project>): Promise<Project[]> {
    applyTenantFilter(options, this.tenantContextService.getWorkspaceId());
    return this.repository.find(options);
  }

  async softRemove(project: Project): Promise<Project> {
    return this.repository.softRemove(project);
  }
}
