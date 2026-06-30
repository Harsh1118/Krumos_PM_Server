import { Task, TaskPriority, TaskStatus } from '../entities/task.entity';
import { UserMinResponseDto } from '../../users/mappers/user.mapper';
import { ProjectResponseDto } from '../../projects/mappers/project.mapper';

export interface TaskResponseDto {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  assignee?: UserMinResponseDto | null;
  reporter?: UserMinResponseDto;
  project?: ProjectResponseDto;
}

export const mapTaskToResponse = (task: Task): TaskResponseDto => ({
  id: task.id,
  projectId: task.projectId,
  workspaceId: task.workspaceId,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assigneeId: task.assigneeId,
  reporterId: task.reporterId,
  dueDate: task.dueDate,
  order: task.order,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  assignee: task.assignee
    ? {
        id: task.assignee.id,
        name: task.assignee.name,
        avatarUrl: task.assignee.avatarUrl,
      }
    : null,
  reporter: task.reporter
    ? {
        id: task.reporter.id,
        name: task.reporter.name,
        avatarUrl: task.reporter.avatarUrl,
      }
    : undefined,
  project: task.project
    ? {
        id: task.project.id,
        name: task.project.name,
        description: task.project.description,
        workspaceId: task.project.workspaceId,
        isArchived: task.project.isArchived,
        createdById: task.project.createdById,
        createdAt: task.project.createdAt,
        updatedAt: task.project.updatedAt,
      }
    : undefined,
});
