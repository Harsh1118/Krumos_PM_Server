import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, FindManyOptions, DeepPartial } from 'typeorm';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repository: Repository<Project>,
  ) {}

  async findOne(options: FindOneOptions<Project>): Promise<Project | null> {
    return this.repository.findOne(options);
  }

  create(data: DeepPartial<Project>): Project {
    return this.repository.create(data);
  }

  async save(project: Project): Promise<Project> {
    return this.repository.save(project);
  }

  async find(options: FindManyOptions<Project>): Promise<Project[]> {
    return this.repository.find(options);
  }

  async softRemove(project: Project): Promise<Project> {
    return this.repository.softRemove(project);
  }
}
