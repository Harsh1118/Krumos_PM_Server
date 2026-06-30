import { Injectable, ForbiddenException } from '@nestjs/common';
import {
  Task,
  TaskPriority,
} from '../../../modules/tasks/entities/task.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { WorkspaceRole } from '../../../modules/workspaces/entities/workspace-member.entity';

export interface TaskUpdateStrategy {
  validate(
    task: Task,
    user: User,
    data: {
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
      [key: string]: any;
    },
  ): void;
}

@Injectable()
export class AdminTaskUpdateStrategy implements TaskUpdateStrategy {
  validate(
    _task: Task,
    _user: User,
    _data: {
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
      [key: string]: any;
    },
  ): void {
    // ADMIN can modify all fields; no restrictions.
    void _task;
    void _user;
    void _data;
  }
}

@Injectable()
export class ManagerTaskUpdateStrategy implements TaskUpdateStrategy {
  validate(
    _task: Task,
    _user: User,
    _data: {
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
      [key: string]: any;
    },
  ): void {
    // MANAGERs can modify all task fields; no restrictions.
    void _task;
    void _user;
    void _data;
  }
}

@Injectable()
export class MemberTaskUpdateStrategy implements TaskUpdateStrategy {
  validate(
    task: Task,
    user: User,
    data: {
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
      [key: string]: any;
    },
  ): void {
    // MEMBERs can only update tasks assigned to them.
    if (task.assigneeId !== user.id) {
      throw new ForbiddenException(
        'MEMBERs can only update tasks assigned to them',
      );
    }

    const isChangingPriority =
      data.priority !== undefined && data.priority !== task.priority;
    const isChangingAssignee =
      data.assigneeId !== undefined && data.assigneeId !== task.assigneeId;
    const oldDateStr = task.dueDate ? task.dueDate.toISOString() : null;
    const newDateStr =
      data.dueDate !== undefined
        ? data.dueDate
          ? new Date(data.dueDate).toISOString()
          : null
        : oldDateStr;
    const isChangingDueDate =
      data.dueDate !== undefined && oldDateStr !== newDateStr;

    if (isChangingPriority || isChangingAssignee || isChangingDueDate) {
      throw new ForbiddenException(
        'Only admins can change task priority, assignee, and due date',
      );
    }
  }
}

@Injectable()
export class TaskUpdateStrategySelector {
  constructor(
    private readonly adminStrategy: AdminTaskUpdateStrategy,
    private readonly managerStrategy: ManagerTaskUpdateStrategy,
    private readonly memberStrategy: MemberTaskUpdateStrategy,
  ) {}

  getStrategy(role: WorkspaceRole): TaskUpdateStrategy {
    switch (role) {
      case WorkspaceRole.ADMIN:
        return this.adminStrategy;
      case WorkspaceRole.MANAGER:
        return this.managerStrategy;
      case WorkspaceRole.MEMBER:
        return this.memberStrategy;
      default:
        throw new ForbiddenException(
          `Unsupported workspace role: ${role as string}`,
        );
    }
  }
}
