import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../entities/task.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace-member.entity';
import { ActivityLogsService } from '../../activity-logs/services/activity-logs.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { EventsGateway } from '../../../core/events/events.gateway';
import { User } from '../../users/entities/user.entity';
import { TaskUpdateStrategySelector } from '../../../core/strategies/tasks/task-update.strategy';
import { TasksRepository } from '../repositories/tasks.repository';
import { ProjectsRepository } from '../../projects/repositories/projects.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TasksRepository,
    private readonly projectRepository: ProjectsRepository,
    private readonly activityLogsService: ActivityLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
    private readonly taskUpdateStrategySelector: TaskUpdateStrategySelector,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    workspaceId: string,
    projectId: string,
    reporter: User,
    data: {
      title: string;
      description?: string;
      assigneeId?: string;
      priority?: TaskPriority;
      dueDate?: Date;
    },
    slug: string,
  ): Promise<Task> {
    // 1. Verify project exists and belongs to the workspace
    const project = await this.projectRepository.findOne({
      where: { id: projectId, workspaceId },
    });
    if (!project) {
      throw new NotFoundException(`Project not found in this workspace`);
    }

    // 2. Calculate the order within the TODO column
    const lastTask = await this.taskRepository.findOne({
      where: { projectId, status: TaskStatus.TODO },
      order: { order: 'DESC' },
    });
    const nextOrder = lastTask ? lastTask.order + 1.0 : 1.0;

    // 3. Create task
    const task = this.taskRepository.create({
      projectId,
      workspaceId,
      title: data.title.trim(),
      description: data.description || null,
      assigneeId: data.assigneeId || null,
      priority: data.priority || TaskPriority.MEDIUM,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      reporterId: reporter.id,
      status: TaskStatus.TODO,
      order: nextOrder,
    });

    const savedTask = await this.taskRepository.save(task);

    // 4. Create Activity Log
    await this.activityLogsService.log(savedTask.id, reporter.id, 'CREATED', {
      new: {
        title: savedTask.title,
        status: savedTask.status,
        priority: savedTask.priority,
        assigneeId: savedTask.assigneeId,
      },
    });

    // 5. Send Assignment Notification
    if (savedTask.assigneeId) {
      if (savedTask.assigneeId !== reporter.id) {
        await this.notificationsService.create(
          savedTask.assigneeId,
          workspaceId,
          `You have been assigned to task: "${savedTask.title}" in project "${project.name}"`,
          'TASK_ASSIGNED',
          savedTask.id,
        );
      }
    }

    // Load relations for WebSocket broadcast
    const fullyLoadedTask = await this.findOne(workspaceId, savedTask.id);

    // 6. Broadcast socket update
    this.eventsGateway.broadcastToWorkspace(
      slug,
      'task_created',
      fullyLoadedTask,
    );

    return fullyLoadedTask;
  }

  async findAll(
    workspaceId: string,
    projectId: string,
    filters: {
      assigneeId?: string;
      priority?: TaskPriority;
      dueDate?: 'today' | 'week' | 'overdue';
      search?: string;
    },
  ): Promise<Task[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.reporter', 'reporter')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.workspaceId = :workspaceId', { workspaceId });

    if (filters.assigneeId) {
      query.andWhere('task.assigneeId = :assigneeId', {
        assigneeId: filters.assigneeId,
      });
    }

    if (filters.priority) {
      query.andWhere('task.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters.dueDate) {
      const now = new Date();
      if (filters.dueDate === 'today') {
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
        );
        query.andWhere('task.dueDate >= :start AND task.dueDate <= :end', {
          start,
          end,
        });
      } else if (filters.dueDate === 'week') {
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
        const end = new Date();
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59);
        query.andWhere('task.dueDate >= :start AND task.dueDate <= :end', {
          start,
          end,
        });
      } else if (filters.dueDate === 'overdue') {
        query.andWhere('task.dueDate < :now AND task.status != :done', {
          now,
          done: TaskStatus.DONE,
        });
      }
    }

    if (filters.search) {
      query.andWhere(
        '(LOWER(task.title) LIKE :search OR LOWER(task.description) LIKE :search)',
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }

    // Primary order by column status and fractional indices
    return query.orderBy('task.order', 'ASC').getMany();
  }

  async findOne(workspaceId: string, id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id, workspaceId },
      relations: { assignee: true, reporter: true, project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  async update(
    workspaceId: string,
    id: string,
    slug: string,
    user: User,
    userRole: WorkspaceRole,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
      order?: number;
    },
  ): Promise<Task> {
    const task = await this.findOne(workspaceId, id);

    // Resolve the appropriate strategy and execute validation checks
    const strategy = this.taskUpdateStrategySelector.getStrategy(userRole);
    strategy.validate(task, user, data);

    const oldValues: Record<string, string | number | boolean | Date | null> =
      {};
    const newValues: Record<string, string | number | boolean | Date | null> =
      {};
    let isChanged = false;

    // Detect and record mutations for Activity Logs
    if (data.title !== undefined && data.title.trim() !== task.title) {
      oldValues.title = task.title;
      newValues.title = data.title.trim();
      task.title = data.title.trim();
      await this.activityLogsService.log(task.id, user.id, 'TITLE_CHANGED', {
        old: oldValues.title,
        new: newValues.title,
      });
      isChanged = true;
    }

    if (
      data.description !== undefined &&
      data.description !== task.description
    ) {
      task.description = data.description || null;
      isChanged = true;
    }

    if (data.status !== undefined && data.status !== task.status) {
      oldValues.status = task.status;
      newValues.status = data.status;
      task.status = data.status;
      await this.activityLogsService.log(task.id, user.id, 'STATUS_CHANGED', {
        old: oldValues.status,
        new: newValues.status,
      });
      isChanged = true;
    }

    if (data.priority !== undefined && data.priority !== task.priority) {
      oldValues.priority = task.priority;
      newValues.priority = data.priority;
      task.priority = data.priority;
      await this.activityLogsService.log(task.id, user.id, 'PRIORITY_CHANGED', {
        old: oldValues.priority,
        new: newValues.priority,
      });
      isChanged = true;
    }

    if (data.dueDate !== undefined) {
      const oldDateStr = task.dueDate ? task.dueDate.toISOString() : null;
      const newDateStr = data.dueDate
        ? new Date(data.dueDate).toISOString()
        : null;
      if (oldDateStr !== newDateStr) {
        oldValues.dueDate = task.dueDate;
        newValues.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        task.dueDate = newValues.dueDate;
        await this.activityLogsService.log(
          task.id,
          user.id,
          'DUE_DATE_CHANGED',
          { old: oldValues.dueDate, new: newValues.dueDate },
        );
        isChanged = true;
      }
    }

    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
      oldValues.assigneeId = task.assigneeId;
      newValues.assigneeId = data.assigneeId || null;
      task.assigneeId = newValues.assigneeId;

      await this.activityLogsService.log(task.id, user.id, 'ASSIGNEE_CHANGED', {
        old: oldValues.assigneeId,
        new: newValues.assigneeId,
      });
      isChanged = true;

      // Send Assignment Notification to new assignee
      if (task.assigneeId && task.assigneeId !== user.id) {
        await this.notificationsService.create(
          task.assigneeId,
          workspaceId,
          `You have been assigned to task: "${task.title}"`,
          'TASK_ASSIGNED',
          task.id,
        );
      }
    }

    if (data.order !== undefined && data.order !== task.order) {
      task.order = data.order;
      isChanged = true;
    }

    let savedTask = task;
    if (isChanged) {
      savedTask = await this.taskRepository.save(task);

      if (data.order !== undefined) {
        const tasksInColumn = await this.taskRepository.find({
          where: { projectId: task.projectId, status: task.status },
          order: { order: 'ASC' },
        });

        let needsRebalance = false;
        for (let i = 0; i < tasksInColumn.length - 1; i++) {
          if (
            Math.abs(tasksInColumn[i].order - tasksInColumn[i + 1].order) < 1e-9
          ) {
            needsRebalance = true;
            break;
          }
        }

        if (needsRebalance) {
          await this.dataSource.transaction(async (manager) => {
            for (let i = 0; i < tasksInColumn.length; i++) {
              tasksInColumn[i].order = i + 1.0;
            }
            await manager.save(Task, tasksInColumn);
          });
          savedTask =
            (await this.taskRepository.findOne({ where: { id: task.id } })) ||
            task;
        }
      }
    }

    // Refresh and load details
    const fullyLoaded = await this.findOne(workspaceId, savedTask.id);

    // Broadcast update via WebSockets
    this.eventsGateway.broadcastToWorkspace(slug, 'task_updated', fullyLoaded);

    return fullyLoaded;
  }

  async delete(workspaceId: string, id: string, slug: string): Promise<void> {
    const task = await this.findOne(workspaceId, id);
    await this.taskRepository.softRemove(task);

    // Broadcast deletion via WebSockets
    this.eventsGateway.broadcastToWorkspace(slug, 'task_deleted', { id });
  }

  async findActivityLogs(workspaceId: string, taskId: string) {
    await this.findOne(workspaceId, taskId); // Check existence & workspace boundaries
    return this.activityLogsService.findAllForTask(taskId);
  }

  // Daily task due reminder logic (can be triggered by a CRON task)
  async sendDailyDueReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      0,
      0,
      0,
    );
    const end = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      23,
      59,
      59,
    );

    const activeTasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.dueDate >= :start AND task.dueDate <= :end', { start, end })
      .andWhere('task.status != :done', { done: TaskStatus.DONE })
      .getMany();

    for (const t of activeTasks) {
      if (t.assigneeId) {
        await this.notificationsService.create(
          t.assigneeId,
          t.workspaceId,
          `Reminder: Task "${t.title}" is due tomorrow!`,
          'TASK_DUE_REMINDER',
          t.id,
        );
      }
    }
  }
}
