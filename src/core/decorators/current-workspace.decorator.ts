import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Workspace } from '../../modules/workspaces/entities/workspace.entity';
import { WorkspaceRole } from '../../modules/workspaces/entities/workspace-member.entity';

export interface RequestWithWorkspace {
  workspace?: Workspace;
  workspaceRole?: WorkspaceRole;
}

export const CurrentWorkspace = createParamDecorator(
  (data: null | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspace;
  },
);

export const CurrentWorkspaceRole = createParamDecorator(
  (data: null | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspaceRole;
  },
);
