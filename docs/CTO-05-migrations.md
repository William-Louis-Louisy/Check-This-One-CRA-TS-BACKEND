# CTO-05 — Versioned schema migrations

The API DataSource is centralized in `src/database/data-source.ts`. Runtime `migrationsRun=false`; schema synchronization is disabled except in a disposable GitHub CI database with the exact name `cto_security_test` and `NODE_ENV=test`.

## Scope and baseline

This introduces a **tracked, additive TypeORM migration path** for CTO-01 (`user.role`) and CTO-03a (`user.session_version`). It is intended for existing Check This One database schemas. It does not fabricate a production baseline or bootstrap all historic tables. Fresh staging databases need a separately reviewed baseline schema/seed, not a production copy.

## Procedure

1. Review the target DB schema and the two migration files.
2. Make and restore-test a database backup.
3. Compile the backend with `npm ci && npm run build`.
4. Run a **read-only** preflight: `node scripts/migrate-typeorm.cjs`.
5. Verify the database displayed and the pending migration list.
6. Only after approval, apply with `node scripts/migrate-typeorm.cjs --apply --confirm-database=exact_db_name`.
7. Re-run the read-only preflight; it should report no pending migrations.

Both migrations check the live column definitions and accept existing matching columns (including columns already added by the earlier guarded scripts). TypeORM records executed changes in `cto_schema_migrations`. MySQL DDL commits implicitly, so backup restoration and a specific rollback plan remain essential. Reverting `session_version` is blocked when any account has revoked sessions; reverting `role` is blocked while admins exist.

`DB_SYNCHRONIZE=true` is refused by the migration CLI. Neither migrations nor schema sync are run automatically by the production API.

## Verification

The dedicated GitHub Actions migration job checks read-only preflight, incorrect confirmation rejection, additive schema changes, version tracking and idempotency against isolated MySQL 8. Browser/system staging E2E validation and a reviewed comparison against the **actual production schema** are required before any production schema change.
