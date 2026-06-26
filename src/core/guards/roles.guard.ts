import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { WorkspaceRole } from '../../modules/workspaces/entities/workspace-member.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.workspaceRole as WorkspaceRole;

    if (!userRole) {
      throw new ForbiddenException(
        'Workspace role context is missing. Make sure WorkspaceGuard is applied.',
      );
    }

    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Your workspace role (${userRole}) does not have permission to perform this action. Required: ${requiredRoles.join(
          ' or ',
        )}`,
      );
    }

    return true;
  }
}
