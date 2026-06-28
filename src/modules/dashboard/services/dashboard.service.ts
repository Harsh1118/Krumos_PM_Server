import { Injectable } from '@nestjs/common';
import { TaskStatus } from '../../tasks/entities/task.entity';
import {
  mapDashboardSummary,
  mapProjectToTasksByProject,
  mapMemberToTeamWorkload,
} from '../mappers/dashboard.mapper';
import { TasksRepository } from '../../tasks/repositories/tasks.repository';
import { ActivityLogsRepository } from '../../activity-logs/repositories/activity-logs.repository';
import { WorkspaceMembersRepository } from '../../workspaces/repositories/workspace-members.repository';
import { ProjectsRepository } from '../../projects/repositories/projects.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly taskRepository: TasksRepository,
    private readonly activityLogRepository: ActivityLogsRepository,
    private readonly workspaceMemberRepository: WorkspaceMembersRepository,
    private readonly projectRepository: ProjectsRepository,
  ) {}

  async getSummary(workspaceId: string, userId: string) {
    // 1. Get task summary strip counts
    const statusCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.workspaceId = :workspaceId', { workspaceId })
      .groupBy('task.status')
      .getRawMany();

    const summary = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.DONE]: 0,
    };

    statusCounts.forEach((item) => {
      if (summary[item.status] !== undefined) {
        summary[item.status] = parseInt(item.count, 10);
      }
    });

    // 2. Fetch "My Tasks" (Assigned to user, not completed, sorted by due date)
    const myTasks = await this.taskRepository.find({
      where: {
        workspaceId,
        assigneeId: userId,
      },
      relations: { project: true, assignee: true, reporter: true },
      order: {
        dueDate: 'ASC',
      },
    });

    // Filter active tasks and completed tasks separately in memory or query
    const activeMyTasks = myTasks.filter((t) => t.status !== TaskStatus.DONE);

    // 3. Recent activity feed across the workspace (last 20 logs)
    const recentActivity = await this.activityLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.task', 'task')
      .where('task.workspaceId = :workspaceId', { workspaceId })
      .orderBy('log.createdAt', 'DESC')
      .limit(20)
      .getMany();

    return mapDashboardSummary(summary, activeMyTasks, recentActivity);
  }

  async getAnalytics(workspaceId: string) {
    // 1. Fetch tasks by project
    const projects = await this.projectRepository.find({
      where: { workspaceId },
      relations: { tasks: true },
    });

    const tasksByProject = projects.map(mapProjectToTasksByProject);

    // 2. Fetch Team Workload
    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId },
      relations: { user: true },
    });

    // Calculate current week start (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    // Fetch all open tasks count for workspace grouped by assigneeId in a single bulk query
    const openCountsRaw = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.assigneeId', 'assigneeId')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.status != :done', { done: TaskStatus.DONE })
      .andWhere('task.assigneeId IS NOT NULL')
      .groupBy('task.assigneeId')
      .getRawMany();

    // Fetch completed tasks count this week grouped by assigneeId in a single bulk query
    const completedCountsRaw = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.assigneeId', 'assigneeId')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.status = :done', { done: TaskStatus.DONE })
      .andWhere('task.updatedAt >= :startOfWeek', { startOfWeek })
      .andWhere('task.assigneeId IS NOT NULL')
      .groupBy('task.assigneeId')
      .getRawMany();

    // Convert raw query results to quick-lookup Maps
    const openCountsMap = new Map<string, number>();
    openCountsRaw.forEach((item) => {
      if (item.assigneeId) {
        openCountsMap.set(item.assigneeId, parseInt(item.count, 10));
      }
    });

    const completedCountsMap = new Map<string, number>();
    completedCountsRaw.forEach((item) => {
      if (item.assigneeId) {
        completedCountsMap.set(item.assigneeId, parseInt(item.count, 10));
      }
    });

    const teamWorkload = members.map((m) => {
      const openCount = openCountsMap.get(m.userId) || 0;
      const completedCount = completedCountsMap.get(m.userId) || 0;
      return mapMemberToTeamWorkload(m, openCount, completedCount);
    });

    return {
      tasksByProject,
      teamWorkload,
    };
  }
}
