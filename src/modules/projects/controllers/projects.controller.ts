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
import { ProjectsService } from '../services/projects.service';
import { JwtAuthGuard } from '../../../core/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../../../core/guards/workspace.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../../core/decorators/current-workspace.decorator';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceRole } from '../../workspaces/entities/workspace-member.entity';
import { CreateProjectDto } from '../data/requests/create-project.dto';
import { UpdateProjectDto } from '../data/requests/update-project.dto';

@Controller('workspaces/:slug/projects')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(WorkspaceRole.ADMIN, WorkspaceRole.MANAGER)
  async create(
    @CurrentWorkspace() workspace: Workspace,
    @CurrentUser() user: User,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(
      workspace.id,
      user.id,
      createProjectDto.name,
      createProjectDto.description,
    );
  }

  @Get()
  async findAll(@CurrentWorkspace() workspace: Workspace) {
    return this.projectsService.findAll(workspace.id);
  }

  @Get(':id')
  async findOne(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(workspace.id, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(WorkspaceRole.ADMIN, WorkspaceRole.MANAGER)
  async update(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(
      workspace.id,
      id,
      updateProjectDto.name,
      updateProjectDto.description,
      updateProjectDto.isArchived,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(WorkspaceRole.ADMIN)
  async delete(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
  ) {
    await this.projectsService.delete(workspace.id, id);
  }
}
