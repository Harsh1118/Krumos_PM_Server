import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeleteTriggers1782300000000 implements MigrationInterface {
  name = 'SoftDeleteTriggers1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create cascade_project_soft_delete trigger function
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION cascade_project_soft_delete()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL) THEN
                    -- Project is soft-deleted, soft-delete all tasks inside it
                    UPDATE "tasks"
                    SET "deletedAt" = NEW."deletedAt"
                    WHERE "projectId" = NEW."id" AND "deletedAt" IS NULL;
                ELSIF (OLD."deletedAt" IS NOT NULL AND NEW."deletedAt" IS NULL) THEN
                    -- Project is restored, restore all tasks that were soft-deleted along with it
                    UPDATE "tasks"
                    SET "deletedAt" = NULL
                    WHERE "projectId" = NEW."id" AND "deletedAt" = OLD."deletedAt";
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // 2. Attach trigger to projects table
    await queryRunner.query(`
            CREATE TRIGGER project_soft_delete_trigger
            AFTER UPDATE OF "deletedAt" ON "projects"
            FOR EACH ROW
            EXECUTE FUNCTION cascade_project_soft_delete();
        `);

    // 3. Create cascade_workspace_soft_delete trigger function
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION cascade_workspace_soft_delete()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (OLD."deletedAt" IS NULL AND NEW."deletedAt" IS NOT NULL) THEN
                    -- Workspace is soft-deleted:
                    -- A. Soft-delete all projects (which triggers cascade to tasks)
                    UPDATE "projects"
                    SET "deletedAt" = NEW."deletedAt"
                    WHERE "workspaceId" = NEW."id" AND "deletedAt" IS NULL;
                    
                    -- B. Physically delete memberships
                    DELETE FROM "workspace_members"
                    WHERE "workspaceId" = NEW."id";
                    
                    -- C. Physically delete invitations
                    DELETE FROM "invitations"
                    WHERE "workspaceId" = NEW."id";
                ELSIF (OLD."deletedAt" IS NOT NULL AND NEW."deletedAt" IS NULL) THEN
                    -- Workspace is restored, restore all projects
                    UPDATE "projects"
                    SET "deletedAt" = NULL
                    WHERE "workspaceId" = NEW."id" AND "deletedAt" = OLD."deletedAt";
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // 4. Attach trigger to workspaces table
    await queryRunner.query(`
            CREATE TRIGGER workspace_soft_delete_trigger
            AFTER UPDATE OF "deletedAt" ON "workspaces"
            FOR EACH ROW
            EXECUTE FUNCTION cascade_workspace_soft_delete();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove triggers and trigger functions
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS workspace_soft_delete_trigger ON "workspaces";`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS cascade_workspace_soft_delete();`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS project_soft_delete_trigger ON "projects";`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS cascade_project_soft_delete();`,
    );
  }
}
