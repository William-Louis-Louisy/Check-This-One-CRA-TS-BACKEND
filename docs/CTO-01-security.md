# CTO-01 — Authentication and authorization

## Access policy

- Public: registration, login, password reset, public media catalogues, public lists and badges.
- Authenticated: editing one's own profile, creating a list, liking on one's own behalf, marking content seen on one's own behalf, accessing own notifications. Admin may edit user profiles but cannot like/mark content or read notifications on someone else's behalf.
- List owner (or admin): editing/deleting a list, adding/removing its content.
- Admin: all-users listing, internal all-lists listing, badge creation/update/deletion, global badge verification, deleting a shared content entity.
- Private lists: owner/admin only. The compatibility route `/list/getById/:id/user/:userId` ignores `:userId` for authorization.

## JWT

The middleware accepts an `Authorization: Bearer <jwt>` header only (not cookies), to avoid relying on browser third-party cookies or introducing CSRF on protected mutations. It verifies signature/expiry and resolves the user and role from MySQL for every authorized request. Never trust the role sent by the client.

## Database / deployment

The `User` entity now has a `role` column with default `user`; no new user can self-assign admin via registration or profile update.

The backend uses `DB_SYNCHRONIZE=false` by default. Automatic schema synchronization requires an explicit `DB_SYNCHRONIZE=true` **outside production**; it is blocked whenever `NODE_ENV=production`. CI uses this opt-in on an isolated database only. This prevents implicit DDL on production but does not replace a complete TypeORM migration framework (CTO-05).

Before deployment: back up MySQL, verify the backup restores cleanly into a separate database, and run the additive role migration **before starting the new API**. An empty staging database first needs the rest of the existing schema (for example, a schema-only restore). Use an isolated database and separate JWT secret, never the live production database for staging.

Read-only preflight:

```bash
node scripts/migrate-cto01-role.cjs
```

After verifying `DB_NAME`, the schema and backup, explicitly apply the migration (replace `my_staging_db` by your **actual** `DB_NAME`):

```bash
node scripts/migrate-cto01-role.cjs --apply --confirm-database=my_staging_db
```

Once the legitimate account has been verified against both its **database ID and email**, promote only that account:

```bash
node scripts/migrate-cto01-role.cjs --apply --confirm-database=my_staging_db --admin-id=123 --admin-email=verified-admin@example.com
```

These commands are idempotent: an existing correctly defined role column is left unchanged, and an already-admin account is not updated again. No mutation is performed without both `--apply` and `--confirm-database`; an ID/email mismatch refuses the promotion. The change uses MySQL DDL with an implicit commit: rollback requires a planned reverse migration or a tested backup restoration. Do not print passwords, connection URLs, or JWTs in logs.

## Browser compatibility

The frontend CTO-01 branch must be deployed with the API changes. It sends JWTs via Authorization headers, retrieved from sessionStorage for now; a hardened first-party cookie/session design and CSRF controls remain CTO-03.

## Checks

- `npm ci`, then `npm run test:security` (uses the existing TypeScript dependency, no new lockfile changes).
- Verify 401 for unauthenticated mutations, 403 for mutations against another user's resources, 404 for unauthorized private-list reads, and 403 for non-admin badge actions.
- Verify login → profile update → list edit → logout with the corresponding frontend branch.
- CTO-02 (DTOs and data minimization) and CTO-03 (session/cookie hardening) remain separate blockers.

## CORS and staging

CORS is a strict allowlist of exact `http(s)://host[:port]` origins. The shipped defaults cover `http://localhost:3000` and `https://checkthisone.vercel.app`. Supply additional origins via `CORS_ALLOWED_ORIGINS`, separated by commas, without trailing slashes. Example:

```env
CORS_ALLOWED_ORIGINS=https://your-exact-vercel-preview.vercel.app
DB_SYNCHRONIZE=false
NODE_ENV=staging
```

Never use `*` or `*.vercel.app` with credentialed requests. The frontend preview must set `REACT_APP_API_URL` to the **staging** API origin and rebuild to pick up that value. Do not route a preview to production MySQL. The JWT secret must differ from production.

## Automated checks

- GitHub Actions: backend TypeScript typecheck, policy smoke tests, isolated MySQL HTTP authorization & CORS preflight tests.
- Separate CI migration job: no-write dry-run, database-confirmation failures, additive schema update, idempotency, admin ID/email mismatch, and verified promotion.
- Remaining **manual browser acceptance**: register, sign in, refresh, update profile, create/edit/private list, other-user forbidden operations, admin dashboard, notifications, logout.
