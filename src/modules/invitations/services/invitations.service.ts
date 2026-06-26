import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EnvConfig } from '../../../core/config/env-config.service';
import * as crypto from 'crypto';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import {
  WorkspaceMember,
  WorkspaceRole,
} from '../../workspaces/entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../../core/services/email/email.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { WorkspacesRepository } from '../../workspaces/repositories/workspaces.repository';
import { WorkspaceMembersRepository } from '../../workspaces/repositories/workspace-members.repository';
import { UsersRepository } from '../../users/repositories/users.repository';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationRepository: InvitationsRepository,
    private readonly workspaceRepository: WorkspacesRepository,
    private readonly workspaceMemberRepository: WorkspaceMembersRepository,
    private readonly userRepository: UsersRepository,
    private readonly emailService: EmailService,
    private readonly envConfig: EnvConfig,
    private readonly notificationsService: NotificationsService,
  ) {}

  async invite(
    workspace: Workspace,
    invitedBy: User,
    email: string,
    role: WorkspaceRole,
  ): Promise<Invitation> {
    const targetEmail = email.trim().toLowerCase();

    // 1. Check if user is already a member
    const existingUser = await this.userRepository.findOne({
      where: { email: targetEmail },
    });
    if (existingUser) {
      const isMember = await this.workspaceMemberRepository.findOne({
        where: { userId: existingUser.id, workspaceId: workspace.id },
      });
      if (isMember) {
        throw new ConflictException(
          'User is already a member of this workspace',
        );
      }
    }

    // 2. Revoke any previous pending invitations for this email in this workspace
    const existingInvite = await this.invitationRepository.findOne({
      where: {
        email: targetEmail,
        workspaceId: workspace.id,
        status: InvitationStatus.PENDING,
      },
    });
    if (existingInvite) {
      existingInvite.status = InvitationStatus.REVOKED;
      await this.invitationRepository.save(existingInvite);
    }

    // 3. Generate a secure token & 72h expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    // 4. Create and save the new invitation
    const invitation = this.invitationRepository.create({
      email: targetEmail,
      workspaceId: workspace.id,
      role,
      token,
      expiresAt,
      invitedById: invitedBy.id,
    });
    const savedInvite = await this.invitationRepository.save(invitation);

    // 5. Send invitation email
    const { frontendUrl } = this.envConfig.appConfig;
    const inviteLink = `${frontendUrl}/invite/${token}`;
    await this.emailService.sendInvitationEmail(
      targetEmail,
      workspace.name,
      invitedBy.name,
      inviteLink,
    );

    // 6. Create in-app notification if user is already in the system
    if (existingUser) {
      await this.notificationsService.create(
        existingUser.id,
        workspace.id,
        `You have been invited by ${invitedBy.name} to join workspace "${workspace.name}"`,
        'WORKSPACE_INVITE',
        savedInvite.id,
      );
    }

    return savedInvite;
  }

  async getPendingInvitations(workspaceId: string): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: { workspaceId, status: InvitationStatus.PENDING },
      relations: { invitedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(workspaceId: string, id: string): Promise<void> {
    const invite = await this.invitationRepository.findOne({
      where: { id, workspaceId },
    });
    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }
    invite.status = InvitationStatus.REVOKED;
    await this.invitationRepository.save(invite);
  }

  async verify(token: string) {
    const invite = await this.invitationRepository.findOne({
      where: { token },
      relations: { workspace: true, invitedBy: true },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    if (invite.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation is no longer valid (Status: ${invite.status})`,
      );
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invitation link has expired');
    }

    return invite;
  }

  async accept(token: string, user: User) {
    const invite = await this.verify(token);

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException(
        `This invitation was sent to ${invite.email}, but you are logged in as ${user.email}`,
      );
    }

    // Mark status as ACCEPTED
    invite.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invite);

    // Add user as workspace member
    let member = await this.workspaceMemberRepository.findOne({
      where: { userId: user.id, workspaceId: invite.workspaceId },
    });

    if (!member) {
      member = this.workspaceMemberRepository.create({
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
      });
      await this.workspaceMemberRepository.save(member);
    }

    return invite.workspace;
  }

  async getMembers(workspaceId: string) {
    return this.workspaceMemberRepository.find({
      where: { workspaceId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
  }

  async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    newRole: WorkspaceRole,
  ) {
    const member = await this.workspaceMemberRepository.findOne({
      where: { userId: memberUserId, workspaceId },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    // Enforce that we cannot change the role of the last ADMIN
    if (
      member.role === WorkspaceRole.ADMIN &&
      newRole !== WorkspaceRole.ADMIN
    ) {
      const adminCount = await this.workspaceMemberRepository.count({
        where: { workspaceId, role: WorkspaceRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot change the role of the last administrator',
        );
      }
    }

    member.role = newRole;
    return this.workspaceMemberRepository.save(member);
  }

  async removeMember(workspaceId: string, memberUserId: string) {
    const member = await this.workspaceMemberRepository.findOne({
      where: { userId: memberUserId, workspaceId },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    // Check last admin rule
    if (member.role === WorkspaceRole.ADMIN) {
      const adminCount = await this.workspaceMemberRepository.count({
        where: { workspaceId, role: WorkspaceRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last administrator from the workspace',
        );
      }
    }

    await this.workspaceMemberRepository.remove(member);
  }
}
