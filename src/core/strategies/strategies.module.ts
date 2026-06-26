import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EnvConfigModule } from '../config/env-config.module';
import { EnvConfig } from '../config/env-config.service';
import { User } from '../../modules/users/entities/user.entity';

import {
  DefaultEmailMaskingStrategy,
  FullEmailMaskingStrategy,
} from './email/email-masking.strategy';
import { JwtAuthStrategy } from './auth/jwt-auth.strategy';
import { GoogleAuthStrategy } from './auth/google-auth.strategy';
import {
  AdminTaskUpdateStrategy,
  ManagerTaskUpdateStrategy,
  MemberTaskUpdateStrategy,
  TaskUpdateStrategySelector,
} from './tasks/task-update.strategy';

@Global()
@Module({
  imports: [
    EnvConfigModule,
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [EnvConfigModule],
      useFactory: async (envConfig: EnvConfig) => ({
        secret: envConfig.jwtConfig.secret,
        signOptions: {
          expiresIn: envConfig.jwtConfig.expiry as any,
        },
      }),
      inject: [EnvConfig],
    }),
  ],
  providers: [
    DefaultEmailMaskingStrategy,
    FullEmailMaskingStrategy,
    JwtAuthStrategy,
    GoogleAuthStrategy,
    AdminTaskUpdateStrategy,
    ManagerTaskUpdateStrategy,
    MemberTaskUpdateStrategy,
    TaskUpdateStrategySelector,
  ],
  exports: [
    DefaultEmailMaskingStrategy,
    FullEmailMaskingStrategy,
    JwtAuthStrategy,
    GoogleAuthStrategy,
    AdminTaskUpdateStrategy,
    ManagerTaskUpdateStrategy,
    MemberTaskUpdateStrategy,
    TaskUpdateStrategySelector,
    PassportModule,
  ],
})
export class StrategiesModule {}
