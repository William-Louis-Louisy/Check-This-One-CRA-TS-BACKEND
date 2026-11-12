import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionVersion1794441601000 implements MigrationInterface {
  name = "AddSessionVersion1794441601000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      "SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT " +
      "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() " +
      "AND TABLE_NAME = 'user' AND COLUMN_NAME = 'session_version'"
    );
    if (rows.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `user` ADD COLUMN `session_version` INT UNSIGNED NOT NULL DEFAULT 0"
      );
      return;
    }
    if (rows[0].COLUMN_TYPE.toLowerCase() !== "int unsigned" ||
        rows[0].IS_NULLABLE !== "NO" ||
        Number(rows[0].COLUMN_DEFAULT) !== 0) {
      throw new Error("Existing user.session_version definition is incompatible with CTO-03a");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [result] = await queryRunner.query(
      "SELECT COUNT(*) AS count FROM `user` WHERE session_version <> 0"
    );
    if (Number(result.count) > 0) {
      throw new Error("Cannot roll back session versioning after sessions have been revoked");
    }
    await queryRunner.query("ALTER TABLE `user` DROP COLUMN `session_version`");
  }
}
