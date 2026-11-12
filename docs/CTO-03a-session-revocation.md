# CTO-03a — Immediate revocation of signed Bearer JWTs

This is a **partial CTO-03 implementation**, not a first-party cookie or CSRF session architecture.

## Behavior
- The User entity has an integer `session_version` starting at 0.
- Registration and login issue a three-day signed JWT with an `sv` claim matching the database.
- The authentication middleware compares the claim against the current database version for **every authenticated request**.
- `POST /logout` requires a Bearer JWT and atomically increments the database version, invalidating all previously issued JWTs for that user, even if copied to another device.
- Login after logout issues a new valid token.
- The old `GET /logout` route is intentionally removed; the React client must call `POST`.
- API no longer sets an unused cross-site `jwt` cookie. CTO-01 sessionStorage transport remains in use until CTO-03b.

## Database migration (before API rollout)

**No production data is changed by this PR.** After a reviewed backup and restore rehearsal, connect to the *intended* database, with distinct staging/production configuration, and run the read-only check:

```bash
npm run db:cto03
```

Then, only after explicit authorization, apply:

```bash
npm run db:cto03 -- --apply --confirm-database=the_exact_db_name
```

This additive DDL is idempotent and preserves existing users. Production must have CTO-01 roles migrated first. The migration makes no changes without both confirmation flags; MySQL DDL is not transactionally reversible. Validate against an isolated copy before changing a live database.

## Compatibility and remaining work

Old CTO-01 JWTs have no `sv` claim, so a CTO-03a rollout forces existing users to sign in again. The client must be deployed in the same rollout; its logout request changes from GET to POST. The current frontend stores Bearer credentials in sessionStorage. First-party HttpOnly cookies, CSRF strategy, cross-site constraints, token renewal and per-device sessions are still open in CTO-03b.
