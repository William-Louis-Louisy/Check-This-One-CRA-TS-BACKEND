// CTO-01 explicit, idempotent role-column migration and verified admin promotion.
// Nothing is written unless --apply AND --confirm-database=<DB_NAME> are passed.
require("dotenv").config();
const mysql = require("mysql2/promise");

function parseArgs(argv) {
  const args = new Map();
  const permitted = new Set(["--apply", "--confirm-database", "--admin-id", "--admin-email"]);
  for (const entry of argv) {
    const position = entry.indexOf("=");
    const key = position < 0 ? entry : entry.slice(0, position);
    const value = position < 0 ? true : entry.slice(position + 1);
    if (!permitted.has(key) || args.has(key) || (key !== "--apply" && value === true) || (key === "--apply" && value !== true)) {
      throw new Error("Invalid or duplicate argument: " + key);
    }
    args.set(key, value);
  }
  if (args.has("--admin-id") !== args.has("--admin-email")) {
    throw new Error("Supply both --admin-id and --admin-email.");
  }
  const rawId = args.get("--admin-id");
  if (rawId && (!/^[1-9][0-9]*$/.test(rawId) || !Number.isSafeInteger(Number(rawId)))) {
    throw new Error("Invalid administrator ID.");
  }
  return args;
}

async function getRoleColumn(db) {
  const [columns] = await db.execute(
    "SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'role'"
  );
  return columns[0];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = args.has("--apply");
  const dbName = process.env.DB_NAME;
  if (!process.env.DB_HOST || !dbName || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error("DB_HOST, DB_NAME, DB_USER and DB_PASSWORD must be set.");
  }

  if (apply && args.get("--confirm-database") !== dbName) {
    throw new Error("Write refused: supply --confirm-database=" + dbName);
  }
  if (!apply && args.has("--confirm-database")) {
    throw new Error("--confirm-database is only meaningful with --apply.");
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
  });

  try {
    const [[current]] = await db.query("SELECT DATABASE() AS name");
    if (current.name !== dbName) throw new Error("Connected to the wrong database.");

    const [tables] = await db.execute(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user'"
    );
    if (!tables.length) throw new Error("The user table is missing. Restore the schema before CTO-01.");

    let role = await getRoleColumn(db);
    if (!role) {
      if (!apply) {
        console.log("[CHECK] Role column absent: migration required in " + dbName);
        return;
      }
      // DDL commits implicitly in MySQL: take and verify a DB backup first.
      await db.query("ALTER TABLE `user` ADD COLUMN `role` VARCHAR(16) NOT NULL DEFAULT 'user'");
      role = await getRoleColumn(db);
      console.log("[APPLIED] Role column created in " + dbName);
    }

    if (!role ||
        role.COLUMN_TYPE.toLowerCase() !== "varchar(16)" ||
        role.IS_NULLABLE !== "NO" ||
        String(role.COLUMN_DEFAULT).replace(/'/g, "") !== "user") {
      throw new Error("Role column exists but does not match the expected definition.");
    }

    const [[unexpected]] = await db.query(
      "SELECT COUNT(*) AS count FROM `user` WHERE role NOT IN ('user', 'admin')"
    );
    if (Number(unexpected.count) > 0) {
      throw new Error("Unexpected role values exist; abort and inspect the data.");
    }

    const adminId = args.has("--admin-id") ? Number(args.get("--admin-id")) : undefined;
    if (adminId !== undefined) {
      const email = args.get("--admin-email");
      const [users] = await db.execute("SELECT id, email, role FROM `user` WHERE id = ?", [adminId]);
      if (users.length !== 1 || users[0].email !== email) {
        throw new Error("Admin identity mismatch: ID and email must both match an existing user.");
      }

      if (apply && users[0].role === "user") {
        await db.beginTransaction();
        try {
          const [result] = await db.execute(
            "UPDATE `user` SET role = 'admin' WHERE id = ? AND email = ? AND role = 'user'",
            [adminId, email]
          );
          if (result.affectedRows !== 1) throw new Error("Admin promotion failed: state changed.");
          await db.commit();
          console.log("[APPLIED] Administrator promoted by verified ID: " + adminId);
        } catch (error) {
          await db.rollback();
          throw error;
        }
      } else {
        console.log("[CHECK] Administrator " + adminId + " role is " + users[0].role);
      }
    }

    console.log("[OK] CTO-01 schema checked in " + dbName + (apply ? " (apply mode)" : " (read-only)"));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("[FAILED] " + error.message);
  process.exitCode = 1;
});
