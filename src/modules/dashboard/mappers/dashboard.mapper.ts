import { TaskStatus } from '../../tasks/entities/task.entity';
import { TaskResponseDto, mapTaskToResponse } from '../../tasks/mappers/task.mapper';
import { ActivityLogResponseDto, mapActivityLogToResponse } from '../../activity-logs/mappers/activity-log.mapper';
import { Task } from '../../tasks/entities/task.entity';
import { ActivityLog } from '../../activity-logs/entities/activity-log.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkspaceMember } from '../../workspaces/entities/workspace-member.entity';

export interface DashboardSummaryResponseDto {
  taskSummary: Record<TaskStatus, number>;
  myTasks: TaskResponseDto[];
  recentActivity: ActivityLogResponseDto[];
}

export interface TasksByProjectDto {
  projectId: string;
  projectName: string;
  isArchived: boolean;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
}

export interface TeamWorkloadDto {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  openTasksCount: number;
  completedTasksThisWeekCount: number;
}

export interface DashboardAnalyticsResponseDto {
  tasksByProject: TasksByProjectDto[];
  teamWorkload: TeamWorkloadDto[];
}

export const mapDashboardSummary = (
  summary: Record<TaskStatus, number>,
  myTasks: Task[],
  recentActivity: ActivityLog[],
): DashboardSummaryResponseDto => ({
  taskSummary: summary,
  myTasks: myTasks.map(mapTaskToResponse),
  recentActivity: recentActivity.map(mapActivityLogToResponse),
});

export const mapProjectToTasksByProject = (project: Project): TasksByProjectDto => {
  const counts = {
    [TaskStatus.TODO]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.IN_REVIEW]: 0,
    [TaskStatus.DONE]: 0,
  };
  if (project.tasks) {
    project.tasks.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
  }
  return {
    projectId: project.id,
    projectName: project.name,
    isArchived: project.isArchived,
    todo: counts[TaskStatus.TODO],
    inProgress: counts[TaskStatus.IN_PROGRESS],
    inReview: counts[TaskStatus.IN_REVIEW],
    done: counts[TaskStatus.DONE],
  };
};

export const mapMemberToTeamWorkload = (
  member: WorkspaceMember,
  openTasksCount: number,
  completedTasksThisWeekCount: number,
): TeamWorkloadDto => ({
  userId: member.userId,
  name: member.user.name,
  avatarUrl: member.user.avatarUrl,
  role: member.role,
  openTasksCount,
  completedTasksThisWeekCount,
});
