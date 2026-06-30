import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThan } from 'typeorm';
import { EnvConfig } from '../../core/config/env-config.service';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly envConfig: EnvConfig,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
    this.logger.log('Starting scheduled cleanup of soft-deleted records...');

    const retentionDays = this.envConfig.retentionDays;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

    await this.dataSource.transaction(async (manager) => {
      // 1. Permanently delete soft-deleted tasks older than thresholdDate
      const deletedTasks = await manager.delete(Task, {
        deletedAt: LessThan(thresholdDate),
      });
      this.logger.log(
        `Permanently removed ${deletedTasks.affected || 0} soft-deleted tasks older than ${retentionDays} days.`,
      );

      // 2. Permanently delete soft-deleted projects older than thresholdDate
      const deletedProjects = await manager.delete(Project, {
        deletedAt: LessThan(thresholdDate),
      });
      this.logger.log(
        `Permanently removed ${deletedProjects.affected || 0} soft-deleted projects older than ${retentionDays} days.`,
      );

      // 3. Permanently delete soft-deleted workspaces older than thresholdDate
      const deletedWorkspaces = await manager.delete(Workspace, {
        deletedAt: LessThan(thresholdDate),
      });
      this.logger.log(
        `Permanently removed ${deletedWorkspaces.affected || 0} soft-deleted workspaces older than ${retentionDays} days.`,
      );

      // 4. Delete orphaned notifications referencing non-existent tasks
      await manager.query(`
        DELETE FROM "notifications"
        WHERE "relatedId" IS NOT NULL
          AND "type" IN ('TASK_ASSIGNED', 'NEW_COMMENT', 'TASK_DUE_REMINDER')
          AND "relatedId" NOT IN (SELECT "id"::text FROM "tasks")
      `);
      this.logger.log(
        `Cleaned up orphaned notifications referencing permanently deleted tasks.`,
      );
    });

    this.logger.log('Scheduled cleanup complete.');
  }
}
