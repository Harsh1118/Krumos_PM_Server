import { IsEnum, IsNotEmpty } from 'class-validator';
import { WorkspaceRole } from '../../../workspaces/entities/workspace-member.entity';

export class UpdateMemberRoleDto {
  @IsEnum(WorkspaceRole)
  @IsNotEmpty()
  role: WorkspaceRole;
}
