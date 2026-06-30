import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './services/projects.service';
import { ProjectsController } from './controllers/projects.controller';
import { Project } from './entities/project.entity';
import { AuthModule } from '../auth/auth.module';
import { ProjectsRepository } from './repositories/projects.repository';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), AuthModule, WorkspacesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService, ProjectsRepository, TypeOrmModule],
})
export class ProjectsModule {}
