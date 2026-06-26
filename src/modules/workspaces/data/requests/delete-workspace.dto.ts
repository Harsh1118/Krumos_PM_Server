import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  confirmSlug: string;
}
