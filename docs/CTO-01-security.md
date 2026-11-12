# CTO-01 — Authentication and authorization

## Access policy

- Public: registration, login, password reset, public media catalogues, public lists and badges.
- Authenticated: editing one's own profile, creating a list, liking on one's own behalf, marking content seen on one's own behalf, accessing own notifications.
- List owner (or admin): editing/deleting a list, adding/removing its content.
- Admin: all-users listing, internal all-lists listing, badge creation/update/deletion, global badge verification, deleting a shared content entity.
- Private lists: owner/admin only. The compatibility route `/list/getById/:id/user/:userId` ignores `:userId` for authorization.

## JWT

The middleware accepts an `Authorization: Bearer <jwt>` header and, for compatibility, the existing `jwt` cookie. It verifies signature/expiry and resolves the user and role from MySQL for every authorized request. Never trust the role sent by the client.

## Database / deployment

The `User` entity now has a `role` column with default `user`; no new user can self-assign admin via registration or profile update.

BEFORE deploying: plan a database backup and explicit schema update, then promote only the verified existing administrator by **database ID**, not by choosing the username "admin". For a MySQL deployment that does not yet have the role column:

```sql
ALTER TABLE `user` ADD COLUMN `role` VARCHAR(16) NOT NULL DEFAULT 'user';
-- After personally verifying the legitimate admin's database ID:
-- UPDATE `user` SET `role` = 'admin' WHERE `id` = <VERIFIED_ADMIN_ID>;
```

The existing datasource still uses `synchronize: true`; disabling it and adopting reversible migrations is CTO-05. Do not deploy this change without validating schema and admin access first.

## Browser compatibility

The frontend CTO-01 branch must be deployed with the API changes. It sends JWTs via Authorization headers, retrieved from sessionStorage for now; a hardened first-party cookie/session design and CSRF controls remain CTO-03.

## Checks

- `npm install`, then `npm run test:security`.
- Verify 401 for unauthenticated mutations, 403 for mutations against another user's resources, 404 for unauthorized private-list reads, and 403 for non-admin badge actions.
- Verify login → profile update → list edit → logout with the corresponding frontend branch.
- CTO-02 (DTOs and data minimization) and CTO-03 (session/cookie hardening) remain separate blockers.
