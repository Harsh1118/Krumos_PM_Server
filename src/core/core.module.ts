import { Module, Global } from '@nestjs/common';
import { EnvConfigModule } from './config/env-config.module';
import { StrategiesModule } from './strategies/strategies.module';
import { EmailModule } from './services/email/email.module';
import { EventsModule } from './events/events.module';
import { TenantContextService } from './context/tenant-context.service';

@Global()
@Module({
  imports: [EnvConfigModule, StrategiesModule, EmailModule, EventsModule],
  providers: [TenantContextService],
  exports: [
    EnvConfigModule,
    StrategiesModule,
    EmailModule,
    EventsModule,
    TenantContextService,
  ],
})
export class CoreModule {}
