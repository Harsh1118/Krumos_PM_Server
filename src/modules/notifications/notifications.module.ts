import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsRepository } from './repositories/notifications.repository';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    AuthModule,
    WorkspacesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
