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
import { CommentsService } from '../services/comments.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../../core/guards/workspace.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import {
  CurrentWorkspace,
  CurrentWorkspaceRole,
} from '../../../core/decorators/current-workspace.decorator';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace-member.entity';
import { CreateCommentDto } from '../data/requests/create-comment.dto';
import { UpdateCommentDto } from '../data/requests/update-comment.dto';
import { mapCommentToResponse } from '../mappers/comment.mapper';

@Controller('workspaces/:slug')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('tasks/:taskId/comments')
  async create(
    @CurrentWorkspace() workspace: Workspace,
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const comment = await this.commentsService.create(
      workspace.id,
      taskId,
      user,
      createCommentDto.content,
    );
    return mapCommentToResponse(comment);
  }

  @Get('tasks/:taskId/comments')
  async findAll(
    @CurrentWorkspace() workspace: Workspace,
    @Param('taskId') taskId: string,
  ) {
    const comments = await this.commentsService.findAllForTask(
      workspace.id,
      taskId,
    );
    return comments.map(mapCommentToResponse);
  }

  @Patch('comments/:id')
  async update(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.commentsService.update(
      workspace.id,
      id,
      user.id,
      updateCommentDto.content,
    );
    return mapCommentToResponse(comment);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @CurrentWorkspaceRole() role: WorkspaceRole,
  ) {
    await this.commentsService.delete(workspace.id, id, user, role);
  }
}
