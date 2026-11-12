# CTO-03b — HttpOnly cookies + stateless CSRF protection

## Architecture

- The browser authenticates with a **host-only** session cookie, named `__Host-cto_session` on HTTPS staging/production (`cto_session` on local HTTP/test).
- Cookie flags: `HttpOnly; Secure; SameSite=Lax; Path=/` (Secure omitted only in local HTTP/test). `Domain` is **never set**.
- `POST /login` returns only an allowlisted user and an HMAC-based `csrfToken`; **never a JWT**. The same cookie is set by `Set-Cookie`.
- Registration does not create a session. `GET /session` authenticates the cookie and returns `{ user, csrfToken }` with `Cache-Control: no-store`.
- Auth middleware accepts cookies **only**, no Authorization Bearer fallback. It validates JWT signature, expiry, `session_version` and database role on every request.
- Non-safe authenticated endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require `X-CSRF-Token` = HMAC(`JWT_SECRET`, `cto-csrf-v1:JWT`) with timing-safe comparison.
- All browser mutations reject untrusted `Origin` headers or `Sec-Fetch-Site: cross-site`, including login and password reset.
- The React client enables `withCredentials` **only** for the configured API and retains the CSRF token **in memory only**. Legacy Bearer/localStorage state is removed.
- `POST /logout` increments `session_version` in MySQL and clears the cookie. Password reset also revokes all previous sessions.
- Each JWT includes a random `jti`, preventing duplicate tokens for distinct logins in the same second.

## Critical hosting constraint

The staging frontend and API are on sibling HTTPS hosts under `check-this-one.com` and support SameSite=Lax with `withCredentials` and exact CORS.

However, `https://checkthisone.vercel.app` is a **different site** from a backend at `*.check-this-one.com`. Do **not** deploy CTO-03b there using a direct cross-site API URL. The browser will not reliably send a Lax cookie on cross-site fetch/XHR. There are two approved strategies:

1. Prefer a **same-origin API reverse proxy**: the browser calls `/api` on its own origin. Vercel supports rewriting `/api/:path*` to the real backend origin; the CRA build then uses `REACT_APP_API_URL=/api`. A CapRover Nginx staging proxy can likewise route `/api` to its isolated backend. Verify Set-Cookie and Cookie forwarding, preflight/origin handling and cache exclusion for /api.
2. Alternatively, place production frontend and API on HTTPS sibling hosts of a controlled registrable domain and use `REACT_APP_API_URL` with the API host. Keep CORS exact and `withCredentials` enabled.

**This PR does not change DNS, production Vercel rewrites, deployment environment variables, or CapRover Nginx.** The routing choice must be verified in a browser before production. No `SameSite=None` third-party-cookie workaround is permitted.

## Verification and rollout

1. Run backend CI on the disposable test MySQL. Test no JWT JSON leak, no Bearer fallback, session restore, CSRF failures/success, forbidden origins, role authorization, logout revocation across two logins and password reset.
2. Build the paired frontend CTO-03b branch (must pass CRA CI=true). Preview alone is not proof that cookies survive browser navigation.
3. On isolated staging only, deploy the paired branches after checking CTO-05 migrations; `session_version` already exists from CTO-03a when migrated. The CTO-03b backend requires no new DB schema.
4. In Chrome/Safari/Firefox, inspect HTTPS `Set-Cookie` flags and verify that a refresh restores `GET /session` and all protected mutations send CSRF; confirm anonymous and forbidden operations.
5. Verify no token in JSON, logs, localStorage/sessionStorage, and no session cookie sent to TMDB/YouTube.
6. Confirm the allowed origins for real frontend domains. When using a proxy, confirm that Origin is forwarded correctly; preserve a no-store policy and disable CDN caching on auth routes.
7. Only after explicit approval and production backup/migration rehearsal may paired frontend and backend changes be promoted.

### Compatibility

This is an intentional breaking transport migration: CTO-03a sessionStorage Bearer credentials cease to authenticate; users sign in again. Do not deploy frontend and backend separately. Existing JWT sessions become unusable from browser JS after this change even if not expired.

### Remaining concerns

Server-side logout invalidates all devices (per-user session version), not a single device. Rate limiting, production monitoring, SSO, password-recovery email reliability and auth-provider security review remain separate release considerations. Security headers and a CSP should be audited independently.
