import { MigrationInterface, QueryRunner } from "typeorm";

export class SoftDeleteAndRefreshTokens1782198095050 implements MigrationInterface {
    name = 'SoftDeleteAndRefreshTokens1782198095050'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshtokenhash" character varying`);
        await queryRunner.query(`ALTER TABLE "workspaces" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "projects" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "deletedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refreshtokenhash"`);
    }

}
