import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../../modules/auth/auth.module';
import { WorkspacesModule } from '../../modules/workspaces/workspaces.module';

@Global()
@Module({
  imports: [AuthModule, WorkspacesModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
