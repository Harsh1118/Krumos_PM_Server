import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { WorkspaceRole } from '../../workspaces/types/workspace-role.enum';
import { UserMinResponseDto } from '../../users/mappers/user.mapper';

export interface InvitationResponseDto {
  id: string;
  email: string;
  workspaceId: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: Date;
  invitedById: string;
  status: InvitationStatus;
  createdAt: Date;
  invitedBy?: UserMinResponseDto;
}

export interface InvitationVerifyResponseDto {
  id: string;
  email: string;
  role: WorkspaceRole;
  workspaceName: string;
  invitedBy: string;
}

export const mapInvitationToResponse = (
  invitation: Invitation,
): InvitationResponseDto => ({
  id: invitation.id,
  email: invitation.email,
  workspaceId: invitation.workspaceId,
  role: invitation.role,
  token: invitation.token,
  expiresAt: invitation.expiresAt,
  invitedById: invitation.invitedById,
  status: invitation.status,
  createdAt: invitation.createdAt,
  invitedBy: invitation.invitedBy
    ? {
        id: invitation.invitedBy.id,
        name: invitation.invitedBy.name,
        avatarUrl: invitation.invitedBy.avatarUrl,
      }
    : undefined,
});

export const mapInvitationToVerifyResponse = (
  invitation: Invitation,
  maskedEmail: string,
): InvitationVerifyResponseDto => ({
  id: invitation.id,
  email: maskedEmail,
  role: invitation.role,
  workspaceName: invitation.workspace.name,
  invitedBy: invitation.invitedBy.name,
});
