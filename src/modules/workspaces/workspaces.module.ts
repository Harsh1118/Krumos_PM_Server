import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './services/workspaces.service';
import { WorkspacesController } from './controllers/workspaces.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesRepository } from './repositories/workspaces.repository';
import { WorkspaceMembersRepository } from './repositories/workspace-members.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceMember, User]),
    AuthModule,
  ],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    WorkspacesRepository,
    WorkspaceMembersRepository,
  ],
  exports: [
    WorkspacesService,
    WorkspacesRepository,
    WorkspaceMembersRepository,
    TypeOrmModule,
  ],
})
export class WorkspacesModule {}
