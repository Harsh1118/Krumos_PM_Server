import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, DeepPartial } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';

@Injectable()
export class WorkspacesRepository {
  constructor(
    @InjectRepository(Workspace)
    private readonly repository: Repository<Workspace>,
  ) {}

  async findOne(options: FindOneOptions<Workspace>): Promise<Workspace | null> {
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Workspace>): Workspace {
    return this.repository.create(data);
  }

  async save(workspace: Workspace): Promise<Workspace> {
    return this.repository.save(workspace);
  }

  async softRemove(workspace: Workspace): Promise<Workspace> {
    return this.repository.softRemove(workspace);
  }
}
