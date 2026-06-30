import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { ActivityLogsService } from './services/activity-logs.service';
import { ActivityLogsRepository } from './repositories/activity-logs.repository';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  providers: [ActivityLogsService, ActivityLogsRepository],
  exports: [ActivityLogsService, ActivityLogsRepository],
})
export class ActivityLogsModule {}
