import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRole1794441600000 implements MigrationInterface {
  name = "AddUserRole1794441600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(
      "SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT " +
      "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() " +
      "AND TABLE_NAME = 'user' AND COLUMN_NAME = 'role'"
    );
    if (rows.length === 0) {
      await queryRunner.query(
        "ALTER TABLE `user` ADD COLUMN `role` VARCHAR(16) NOT NULL DEFAULT 'user'"
      );
      return;
    }
    if (rows[0].COLUMN_TYPE.toLowerCase() !== "varchar(16)" ||
        rows[0].IS_NULLABLE !== "NO" ||
        String(rows[0].COLUMN_DEFAULT).replace(/'/g, "") !== "user") {
      throw new Error("Existing user.role definition is incompatible with CTO-01");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [result] = await queryRunner.query(
      "SELECT COUNT(*) AS count FROM `user` WHERE role = 'admin'"
    );
    if (Number(result.count) > 0) {
      throw new Error("Cannot remove the role column while administrators exist");
    }
    await queryRunner.query("ALTER TABLE `user` DROP COLUMN `role`");
  }
}
