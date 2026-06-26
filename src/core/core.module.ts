import { Module, Global } from '@nestjs/common';
import { EnvConfigModule } from './config/env-config.module';
import { StrategiesModule } from './strategies/strategies.module';
import { EmailModule } from './services/email/email.module';
import { EventsModule } from './events/events.module';

@Global()
@Module({
  imports: [
    EnvConfigModule,
    StrategiesModule,
    EmailModule,
    EventsModule,
  ],
  exports: [
    EnvConfigModule,
    StrategiesModule,
    EmailModule,
    EventsModule,
  ],
})
export class CoreModule {}
