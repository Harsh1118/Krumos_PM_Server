import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleIdAndLoginTimestamps1782109010844 implements MigrationInterface {
  name = 'AddGoogleIdAndLoginTimestamps1782109010844';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "googleid" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_fabacc1cb5e35d51e5fe4c3f6c4" UNIQUE ("googleid")`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "loginat" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD "loggedout" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "loggedout"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "loginat"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_fabacc1cb5e35d51e5fe4c3f6c4"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "googleid"`);
  }
}
