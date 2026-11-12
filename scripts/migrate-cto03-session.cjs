// Explicit additive migration for JWT revocation. Read-only unless double-confirmed.
// Requires an independently verified backup and CTO-01 role migration first.
require("dotenv").config();
const mysql = require("mysql2/promise");

function parseArgs(argv) {
  const args = new Map();
  for (const item of argv) {
    const index = item.indexOf("=");
    const key = index < 0 ? item : item.slice(0, index);
    const value = index < 0 ? true : item.slice(index + 1);
    if (!["--apply", "--confirm-database"].includes(key) ||
        (key === "--apply" && value !== true) ||
        (key !== "--apply" && value === true) ||
        args.has(key)) {
      throw new Error("Invalid migration argument: " + key);
    }
    args.set(key, value);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = args.has("--apply");
  const name = process.env.DB_NAME;
  if (!name || !process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error("Missing database configuration");
  }
  if (apply && args.get("--confirm-database") !== name) {
    throw new Error("Write refused: --confirm-database must equal DB_NAME");
  }
  if (!apply && args.has("--confirm-database")) {
    throw new Error("Confirmation is valid only with --apply");
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: name,
  });
  try {
    const [[active]] = await db.query("SELECT DATABASE() AS name");
    if (active.name !== name) throw new Error("Wrong database selected");
    const [tables] = await db.execute(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user'"
    );
    if (!tables.length) throw new Error("The user table must already exist");

    const [existing] = await db.execute(
      "SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'session_version'"
    );

    if (!existing.length) {
      if (!apply) {
        console.log("[CHECK] Add session_version to " + name);
        return;
      }
      await db.query(
        "ALTER TABLE `user` ADD COLUMN `session_version` INT UNSIGNED NOT NULL DEFAULT 0"
      );
      console.log("[APPLIED] Added session_version to " + name);
    } else if (
      existing[0].COLUMN_TYPE.toLowerCase() !== "int unsigned" ||
      existing[0].IS_NULLABLE !== "NO" ||
      Number(existing[0].COLUMN_DEFAULT) !== 0
    ) {
      throw new Error("session_version exists with an incompatible definition");
    } else {
      console.log("[CHECK] session_version already exists in " + name);
    }

    const [[invalid]] = await db.query(
      "SELECT COUNT(*) AS count FROM `user` WHERE session_version IS NULL"
    );
    if (Number(invalid.count) > 0) throw new Error("Invalid session_version data");

    console.log("[OK] JWT session revocation schema: " + name);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("[FAILED] " + error.message);
  process.exitCode = 1;
});
