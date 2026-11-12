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
  try {
    const migration = path.join(__dirname, "migrate-cto03-session.cjs");
    const check = (args, expectedStatus) => {
      const result = spawnSync(process.execPath, [migration, ...args], {
        env: process.env,
        encoding: "utf8"
      });
      assert.equal(result.status, expectedStatus, (result.stdout || "") + (result.stderr || ""));
      return result.stdout || "";
    };

    // A separate CI job has already created the baseline user table.
    const [initial] = await db.execute(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() " +
      "AND TABLE_NAME = 'user' AND COLUMN_NAME = 'session_version'"
    );
    assert.equal(initial.length, 0);

    assert.match(check([], 0), /Add session_version/);
    check(["--apply"], 1);
    check(["--apply", "--confirm-database=wrong"], 1);
    const confirmed = ["--apply", "--confirm-database=cto_security_test"];
    check(confirmed, 0);
    check(confirmed, 0);

    const [rows] = await db.query("SELECT id, session_version FROM `user` ORDER BY id");
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => row.session_version === 0));
    await db.execute("UPDATE `user` SET session_version = session_version + 1 WHERE id = ?", [rows[0].id]);
    const [[updated]] = await db.execute("SELECT session_version FROM `user` WHERE id = ?", [rows[0].id]);
    assert.equal(updated.session_version, 1);
    check([], 0);

    console.log("CTO-03 session migration checks: OK");
  } finally {
    await db.end();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
