import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from '../services/tasks.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../../core/guards/workspace.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import {
  CurrentWorkspace,
  CurrentWorkspaceRole,
} from '../../../core/decorators/current-workspace.decorator';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace-member.entity';
import { TaskPriority } from '../entities/task.entity';
import { CreateTaskDto } from '../data/requests/create-task.dto';
import { UpdateTaskDto } from '../data/requests/update-task.dto';
import { mapTaskToResponse } from '../mappers/task.mapper';
import { mapActivityLogToResponse } from '../../activity-logs/mappers/activity-log.mapper';

@Controller('workspaces/:slug')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // 1. Create a task in a project
  @Post('projects/:projectId/tasks')
  async create(
    @CurrentWorkspace() workspace: Workspace,
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const task = await this.tasksService.create(
      workspace.id,
      projectId,
      user,
      createTaskDto,
      workspace.slug,
    );
    return mapTaskToResponse(task);
  }

  // 2. Find all tasks in a project (with filters)
  @Get('projects/:projectId/tasks')
  async findAll(
    @CurrentWorkspace() workspace: Workspace,
    @Param('projectId') projectId: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('dueDate') dueDate?: 'today' | 'week' | 'overdue',
    @Query('search') search?: string,
  ) {
    const tasks = await this.tasksService.findAll(workspace.id, projectId, {
      assigneeId,
      priority,
      dueDate,
      search,
    });
    return tasks.map(mapTaskToResponse);
  }

  // 3. Find a single task details
  @Get('tasks/:id')
  async findOne(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    const task = await this.tasksService.findOne(workspace.id, id);
    return mapTaskToResponse(task);
  }

  // 4. Update task fields (status, priority, assignee, due date, order)
  @Patch('tasks/:id')
  async update(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @CurrentWorkspaceRole() userRole: WorkspaceRole,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(
      workspace.id,
      id,
      workspace.slug,
      user,
      userRole,
      updateTaskDto,
    );
    return mapTaskToResponse(task);
  }

  // 5. Delete task (ADMIN/MANAGER only)
  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(WorkspaceRole.ADMIN, WorkspaceRole.MANAGER)
  async delete(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    await this.tasksService.delete(workspace.id, id, workspace.slug);
  }

  // 6. Get task activity logs
  @Get('tasks/:taskId/activity')
  async getActivityLogs(
    @CurrentWorkspace() workspace: Workspace,
    @Param('taskId') taskId: string,
  ) {
    const logs = await this.tasksService.findActivityLogs(workspace.id, taskId);
    return logs.map(mapActivityLogToResponse);
  }
}
