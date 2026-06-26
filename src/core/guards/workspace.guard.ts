import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspacesRepository } from '../../modules/workspaces/repositories/workspaces.repository';
import { WorkspaceMembersRepository } from '../../modules/workspaces/repositories/workspace-members.repository';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceMembersRepository: WorkspaceMembersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Resolve workspace slug from header first, then route params
    let slug = request.headers['x-workspace-slug'] as string;
    if (!slug && request.params.slug) {
      slug = request.params.slug;
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

    return true;
  }
}
