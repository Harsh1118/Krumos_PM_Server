import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EnvConfigModule } from '../../core/config/env-config.module';
import { EnvConfig } from '../../core/config/env-config.service';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
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
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
