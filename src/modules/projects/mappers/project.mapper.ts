import { Project } from '../entities/project.entity';
import { UserMinResponseDto } from '../../users/mappers/user.mapper';
import { TaskStatus } from '../../tasks/entities/task.entity';

export interface ProjectResponseDto {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  isArchived: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: UserMinResponseDto;
}

export interface ProjectWithStatsResponseDto extends ProjectResponseDto {
  activeTasksCount: number;
  totalTasksCount: number;
}

export const mapProjectToResponse = (project: Project): ProjectResponseDto => ({
  id: project.id,
  name: project.name,
  description: project.description,
  workspaceId: project.workspaceId,
  isArchived: project.isArchived,
  createdById: project.createdById,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  createdBy: project.createdBy
    ? {
        id: project.createdBy.id,
        name: project.createdBy.name,
        avatarUrl: project.createdBy.avatarUrl,
      }
    : undefined,
});

export const mapProjectToWithStats = (
  project: Project,
): ProjectWithStatsResponseDto => {
  const activeTasksCount = project.tasks
    ? project.tasks.filter((task) => task.status !== TaskStatus.DONE).length
    : 0;
  const totalTasksCount = project.tasks ? project.tasks.length : 0;

  return {
    ...mapProjectToResponse(project),
    activeTasksCount,
    totalTasksCount,
  };
};
