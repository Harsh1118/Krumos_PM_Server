import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspacesRepository } from '../../modules/workspaces/repositories/workspaces.repository';
import { WorkspaceMembersRepository } from '../../modules/workspaces/repositories/workspace-members.repository';
import { TenantContextService } from '../context/tenant-context.service';

import { User } from '../../modules/users/entities/user.entity';
import { Workspace } from '../../modules/workspaces/entities/workspace.entity';
import { WorkspaceRole } from '../../modules/workspaces/entities/workspace-member.entity';

export interface GuardRequest {
  user?: User;
  params: { slug?: string; [key: string]: any };
  headers: Record<string, string | string[] | undefined>;
  workspace?: Workspace;
  workspaceRole?: WorkspaceRole;
}

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Route params take priority over the header.
    // The header is a client-side convenience for the active workspace (stored in localStorage).
    // However, when the URL contains an explicit :slug param (e.g. /api/workspaces/workspace-b/…),
    // that must always win — otherwise navigating directly to a workspace URL would silently
    // resolve to whichever workspace the client last stored in localStorage.
    let slug = request.params.slug;
    if (!slug) {
      slug = request.headers['x-workspace-slug'] as string;
    }

    if (!slug) {
      throw new ForbiddenException('Workspace context is missing');
    }

    // Find the workspace
    const workspace = await this.workspacesRepository.findOne({
      where: { slug },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace with slug "${slug}" not found`);
    }

    // Check membership
    const member = await this.workspaceMembersRepository.findOne({
      where: { userId: user.id, workspaceId: workspace.id },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // Attach workspace and role to the request
    request.workspace = workspace;
    request.workspaceRole = member.role;

    this.tenantContextService.setWorkspaceId(workspace.id);

    return true;
  }
}
