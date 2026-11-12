// Controlled TypeORM migration runner. Read-only by default.
// Requires a compiled backend: npm run build
require("dotenv").config();

function parseArgs(argv) {
  const flags = new Map();
  for (const part of argv) {
    const equals = part.indexOf("=");
    const key = equals < 0 ? part : part.slice(0, equals);
    const value = equals < 0 ? true : part.slice(equals + 1);
    if (!["--apply", "--confirm-database"].includes(key) ||
        (key === "--apply" && value !== true) ||
        (key !== "--apply" && value === true) ||
        flags.has(key)) {
      throw new Error("Invalid migration argument: " + key);
    }
    flags.set(key, value);
  }
  return flags;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const name = process.env.DB_NAME;
  if (!name || !process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error("Missing DB_NAME, DB_HOST, DB_USER or DB_PASSWORD");
  }

  const apply = args.has("--apply");
  if (apply && args.get("--confirm-database") !== name) {
    throw new Error("Write refused: --confirm-database must match DB_NAME");
  }
  if (!apply && args.has("--confirm-database")) {
    throw new Error("--confirm-database requires --apply");
  }

  if (process.env.DB_SYNCHRONIZE === "true") {
    throw new Error("Refusing migrations while DB_SYNCHRONIZE=true");
  }

  let dataSource;
  try {
    dataSource = require("../build/src/database/data-source.js").dataSource;
  } catch (error) {
    throw new Error("Compiled datasource not found; run npm run build first");
  }

  await dataSource.initialize();
  try {
    const [[active]] = await dataSource.query("SELECT DATABASE() AS name");
    if (active.name !== name) throw new Error("Connected to the wrong database");

    const tables = await dataSource.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('user', 'cto_schema_migrations')"
    );
    if (!tables.some(table => table.TABLE_NAME === "user")) {
      throw new Error("Existing application schema required; baseline is missing");
    }

    const hasHistory = tables.some(table => table.TABLE_NAME === "cto_schema_migrations");
    const executed = hasHistory
      ? await dataSource.query("SELECT name FROM `cto_schema_migrations`")
      : [];
    const alreadyApplied = new Set(executed.map(row => row.name));
    const pending = dataSource.migrations
      .map(migration => migration.name)
      .filter(migration => !alreadyApplied.has(migration));

    console.log("[CHECK] Database: " + name);
    console.log("[CHECK] Pending migrations: " + (pending.join(", ") || "none"));

    if (!apply) {
      console.log("[READ ONLY] No changes were performed.");
      return;
    }

    const completed = await dataSource.runMigrations({ transaction: "none" });
    console.log("[APPLIED] " + completed.map(m => m.name).join(", "));
  } finally {
    await dataSource.destroy();
  }
}

main().catch(error => {
  console.error("[FAILED] " + error.message);
  process.exitCode = 1;
});
