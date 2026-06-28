import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InvitationsService } from '../services/invitations.service';
import { DefaultEmailMaskingStrategy } from '../../../core/strategies/email/email-masking.strategy';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../../core/guards/workspace.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../../core/decorators/current-workspace.decorator';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace-member.entity';
import { AcceptInvitationDto } from '../data/requests/accept-invitation.dto';
import { CreateInvitationDto } from '../data/requests/create-invitation.dto';
import { UpdateMemberRoleDto } from '../data/requests/update-member-role.dto';
import { mapInvitationToResponse, mapInvitationToVerifyResponse } from '../mappers/invitation.mapper';

@Controller()
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly emailMaskingStrategy: DefaultEmailMaskingStrategy,
  ) {}

  // 1. Verify invitation token (Public endpoint)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get('invitations/verify/:token')
  async verify(@Param('token') token: string) {
    const invite = await this.invitationsService.verify(token);
    const maskedEmail = this.emailMaskingStrategy.mask(invite.email);
    return mapInvitationToVerifyResponse(invite, maskedEmail);
  }

  // 2. Accept invitation (Requires user authentication)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@CurrentUser() user: User, @Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.invitationsService.accept(acceptInvitationDto.token, user);
  }

  // 3. Create invitation (ADMIN only)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('workspaces/:slug/invitations')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async invite(
    @CurrentWorkspace() workspace: Workspace,
    @CurrentUser() user: User,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    return this.invitationsService.invite(
      workspace,
      user,
      createInvitationDto.email,
      createInvitationDto.role,
    );
  }

  // 4. List pending invitations (ADMIN only)
  @Get('workspaces/:slug/invitations')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async getPending(@CurrentWorkspace() workspace: Workspace) {
    const invitations = await this.invitationsService.getPendingInvitations(workspace.id);
    return invitations.map(mapInvitationToResponse);
  }

  // 5. Revoke invitation (ADMIN only)
  @Delete('workspaces/:slug/invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async revoke(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    await this.invitationsService.revoke(workspace.id, id);
  }

  // 6. List workspace members (All members)
  @Get('workspaces/:slug/members')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  async getMembers(@CurrentWorkspace() workspace: Workspace) {
    return this.invitationsService.getMembers(workspace.id);
  }

  // 7. Change member role (ADMIN only)
  @Patch('workspaces/:slug/members/:userId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async updateRole(
    @CurrentWorkspace() workspace: Workspace,
    @Param('userId') userId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.invitationsService.updateMemberRole(
      workspace.id,
      userId,
      updateMemberRoleDto.role,
    );
  }

  // 8. Remove member (ADMIN only)
  @Delete('workspaces/:slug/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async removeMember(
    @CurrentWorkspace() workspace: Workspace,
    @Param('userId') userId: string,
  ) {
    await this.invitationsService.removeMember(workspace.id, userId);
  }
}
