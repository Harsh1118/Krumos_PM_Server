import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './services/invitations.service';
import { InvitationsController } from './controllers/invitations.controller';
import { Invitation } from './entities/invitation.entity';
import { AuthModule } from '../auth/auth.module';
import { InvitationsRepository } from './repositories/invitations.repository';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    AuthModule,
    WorkspacesModule,
    UsersModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationsRepository],
  exports: [InvitationsService],
})
export class InvitationsModule {}
