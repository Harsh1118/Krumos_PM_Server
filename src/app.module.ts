import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { CoreModule } from './core/core.module';
import { EnvConfig } from './core/config/env-config.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Global Configurations and Infrastructure
    CoreModule,

    // Redis queue configuration
    BullModule.forRootAsync({
      imports: [CoreModule],
      useFactory: async (envConfig: EnvConfig) => ({
        redis: envConfig.redisConfig.url,
      }),
      inject: [EnvConfig],
    }),

    // Rate Limiting (100 requests per minute)
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Database Connection
    TypeOrmModule.forRootAsync({
      imports: [CoreModule],
      useFactory: (envConfig: EnvConfig) => {
        const { url } = envConfig.dbConfig;
        const { isProduction } = envConfig.appConfig;
        const useSSL =
          url && !url.includes('localhost') && !url.includes('127.0.0.1');
        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: !isProduction, // Auto schema sync only in dev
          ssl: useSSL ? { rejectUnauthorized: false } : false,
          migrations: [__dirname + '/core/config/database/migrations/**/*{.ts,.js}'],
          migrationsRun: isProduction, // Auto-run migrations in production
        };
      },
      inject: [EnvConfig],
    }),

    // Feature Modules
    AuthModule,
    WorkspacesModule,
    InvitationsModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    ActivityLogsModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
