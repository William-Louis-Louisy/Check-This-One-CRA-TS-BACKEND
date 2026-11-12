// Destroys schema columns only in the disposable CTO CI MySQL database.
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

async function main() {
  assert.equal(process.env.NODE_ENV, "test");
  assert.equal(process.env.DB_NAME, "cto_security_test");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const cli = path.join(__dirname, "migrate-typeorm.cjs");
  const env = { ...process.env, DB_SYNCHRONIZE: "false" };
  const run = (args, code) => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      env, encoding: "utf8"
    });
    assert.equal(result.status, code, (result.stdout || "") + (result.stderr || ""));
    return (result.stdout || "") + (result.stderr || "");
  };

  try {
    await db.query("ALTER TABLE `user` DROP COLUMN `role`, DROP COLUMN `session_version`");

    assert.match(run([], 0), /READ ONLY/);
    const [before] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' " +
      "AND COLUMN_NAME IN ('role','session_version')"
    );
    assert.equal(before.length, 0);

    run(["--apply"], 1);
    run(["--apply", "--confirm-database=wrong"], 1);
    const exact = ["--apply", "--confirm-database=cto_security_test"];
    assert.match(run(exact, 0), /AddUserRole/);
    assert.match(run(exact, 0), /Pending migrations: none/);

    const [after] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' " +
      "AND COLUMN_NAME IN ('role','session_version')"
    );
    assert.deepEqual(after.map(row => row.COLUMN_NAME).sort(), ["role", "session_version"]);
    const [[history]] = await db.query(
      "SELECT COUNT(*) AS count FROM `cto_schema_migrations`"
    );
    assert.equal(history.count, 2);

    // A schema with pre-applied columns must also be recognized on first run.
    console.log("CTO-05 versioned TypeORM migration tests: OK");
  } finally {
    await db.end();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
