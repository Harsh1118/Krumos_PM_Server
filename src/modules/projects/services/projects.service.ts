import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { mapProjectToWithStats } from '../mappers/project.mapper';
import { ProjectsRepository } from '../repositories/projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepository: ProjectsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    workspaceId: string,
    createdById: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    const cleanName = name.trim();
    const existing = await this.projectRepository.findOne({
      where: { name: cleanName, workspaceId },
    });

    if (existing) {
      throw new ConflictException(
        `Project with name "${cleanName}" already exists in this workspace`,
      );
    }

    const project = this.projectRepository.create({
      name: cleanName,
      description: description?.trim(),
      workspaceId,
      createdById,
    });

    return this.projectRepository.save(project);
  }

  async findAll(workspaceId: string) {
    const projects = await this.projectRepository.find({
      where: { workspaceId },
      relations: { createdBy: true, tasks: true },
      order: { createdAt: 'DESC' },
    });

    return projects.map(mapProjectToWithStats);
  }

  async findOne(workspaceId: string, id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, workspaceId },
      relations: { createdBy: true },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    return project;
  }

  async update(
    workspaceId: string,
    id: string,
    name?: string,
    description?: string,
    isArchived?: boolean,
  ): Promise<Project> {
    const project = await this.findOne(workspaceId, id);

    if (name && name.trim() !== project.name) {
      const cleanName = name.trim();
      const existing = await this.projectRepository.findOne({
        where: { name: cleanName, workspaceId },
      });
      if (existing) {
        throw new ConflictException(
          `Project with name "${cleanName}" already exists in this workspace`,
        );
      }
      project.name = cleanName;
    }

    if (description !== undefined) {
      project.description = description?.trim() || null;
    }

    if (isArchived !== undefined) {
      project.isArchived = isArchived;
    }

    return this.projectRepository.save(project);
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    const project = await this.findOne(workspaceId, id);

    await this.dataSource.transaction(async (manager) => {
      // 1. Soft delete all tasks belonging to this project
      await manager.softDelete(Task, { projectId: id, workspaceId });

      // 2. Soft delete the project itself
      await manager.softRemove(Project, project);
    });
  }
}
