import { Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../../core/guards/workspace.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../../core/decorators/current-workspace.decorator';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { mapNotificationToResponse } from '../mappers/notification.mapper';

@Controller('workspaces/:slug/notifications')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @CurrentWorkspace() workspace: Workspace,
  ) {
    const notifications = await this.notificationsService.findAllForUser(user.id, workspace.id);
    return notifications.map(mapNotificationToResponse);
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: User, @Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(id, user.id);
    return mapNotificationToResponse(notification);
  }

  @Post('read-all')
  async readAll(
    @CurrentUser() user: User,
    @CurrentWorkspace() workspace: Workspace,
  ) {
    await this.notificationsService.markAllAsRead(user.id, workspace.id);
    return { success: true };
  }
}
