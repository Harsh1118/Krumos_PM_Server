import { Workspace } from '../entities/workspace.entity';
import {
  WorkspaceMember,
  WorkspaceRole,
} from '../entities/workspace-member.entity';

export interface WorkspaceResponseDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceWithRoleDto extends WorkspaceResponseDto {
  role: WorkspaceRole;
}

export const mapWorkspaceToResponse = (
  workspace: Workspace,
): WorkspaceResponseDto => ({
  id: workspace.id,
  name: workspace.name,
  slug: workspace.slug,
  logoUrl: workspace.logoUrl,
  createdAt: workspace.createdAt,
  updatedAt: workspace.updatedAt,
});

export const mapWorkspaceMemberToWithRoleDto = (
  membership: WorkspaceMember,
): WorkspaceWithRoleDto => ({
  id: membership.workspace.id,
  name: membership.workspace.name,
  slug: membership.workspace.slug,
  logoUrl: membership.workspace.logoUrl,
  createdAt: membership.workspace.createdAt,
  updatedAt: membership.workspace.updatedAt,
  role: membership.role,
});
