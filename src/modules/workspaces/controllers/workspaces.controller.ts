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
import { Throttle } from '@nestjs/throttler';
import { WorkspacesService } from '../services/workspaces.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../../core/guards/workspace.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { WorkspaceRole } from '../entities/workspace-member.entity';
import { CreateWorkspaceDto } from '../data/requests/create-workspace.dto';
import { UpdateWorkspaceDto } from '../data/requests/update-workspace.dto';
import { DeleteWorkspaceDto } from '../data/requests/delete-workspace.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(
      user.id,
      createWorkspaceDto.name,
      createWorkspaceDto.slug,
    );
  }

  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.workspacesService.findAllForUser(user.id);
  }

  @Patch(':slug')
  @UseGuards(WorkspaceGuard, RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async update(
    @Param('slug') slug: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(
      slug,
      updateWorkspaceDto.name,
      updateWorkspaceDto.logoUrl,
    );
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(WorkspaceGuard, RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async delete(
    @Param('slug') slug: string,
    @Body() deleteWorkspaceDto: DeleteWorkspaceDto,
  ) {
    await this.workspacesService.delete(slug, deleteWorkspaceDto.confirmSlug);
  }
}
