import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../../core/guards/workspace.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../../core/decorators/current-workspace.decorator';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace-member.entity';

@Controller('workspaces/:slug/dashboard')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getSummary(
    @CurrentWorkspace() workspace: Workspace,
    @CurrentUser() user: User,
  ) {
    return this.dashboardService.getSummary(workspace.id, user.id);
  }

  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles(WorkspaceRole.ADMIN, WorkspaceRole.MANAGER)
  async getAnalytics(@CurrentWorkspace() workspace: Workspace) {
    return this.dashboardService.getAnalytics(workspace.id);
  }
}
