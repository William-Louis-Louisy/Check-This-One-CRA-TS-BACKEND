// Executed only against a disposable CI database; does not touch production.
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

async function run() {
  assert.equal(process.env.NODE_ENV, "test", "Refusing to run outside isolated test mode.");
  assert.equal(process.env.DB_NAME, "cto_security_test", "Refusing to use any other database.");
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const migration = path.join(__dirname, "migrate-cto01-role.cjs");
  const runScript = (args, status) => {
    const result = spawnSync(process.execPath, [migration, ...args], {
      env: process.env, encoding: "utf8"
    });
    assert.equal(result.status, status, (result.stdout || "") + (result.stderr || ""));
    return result.stdout || "";
  };

  try {
    await db.query("CREATE TABLE `user` (" +
      "id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE)");
    await db.execute("INSERT INTO `user` (email) VALUES (?), (?)", [
      "admin@example.test", "normal@example.test"
    ]);

    assert.match(runScript([], 0), /Role column absent/);
    const [missing] = await db.execute(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() " +
      "AND TABLE_NAME = 'user' AND COLUMN_NAME = 'role'"
    );
    assert.equal(missing.length, 0, "Dry-run must not add a column.");

    runScript(["--apply"], 1);
    runScript(["--apply", "--confirm-database=wrong_database"], 1);
    const confirmed = ["--apply", "--confirm-database=cto_security_test"];
    runScript(confirmed, 0);
    runScript(confirmed, 0); // idempotent

    let [rows] = await db.query("SELECT id, email, role FROM `user` ORDER BY id");
    assert.deepEqual(rows.map(row => row.role), ["user", "user"]);

    runScript([...confirmed, "--admin-id=1", "--admin-email=wrong@example.test"], 1);
    runScript([...confirmed, "--admin-id=1", "--admin-email=admin@example.test"], 0);
    runScript([...confirmed, "--admin-id=1", "--admin-email=admin@example.test"], 0);

    [rows] = await db.query("SELECT id, email, role FROM `user` ORDER BY id");
    assert.deepEqual(rows.map(row => row.role), ["admin", "user"]);

    console.log("CTO-01 role migration test: OK");
  } finally {
    await db.end();
  }
}

run().catch(err => { console.error(err); process.exitCode = 1; });
