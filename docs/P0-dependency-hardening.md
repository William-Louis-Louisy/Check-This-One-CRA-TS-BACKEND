# P0 — Dependency hardening (draft)

**This branch is not deployed.** It stacks on `validation/p0-staging-smtp` (PR #25) and on CTO-03b.

## First changes
- Upgrade direct MySQL client from `mysql2@2.3.3` to `3.24.6` (major update requiring MySQL 8 integration tests).
- Move development tooling `ts-node-dev` and `typescript` into `devDependencies`.
- Keep `reflect-metadata` in production dependencies; TypeORM needs it at runtime.
- Remove the redundant `crypto` NPM package: Node's built-in `crypto` is used directly.
- Change production start from `npm install --dev && ts-node-dev src/app.ts` to `node build/src/app.js`.
- Regenerate the lockfile with Node 20 in GitHub Actions; never hand-edit lockfile integrity hashes.
- Audit the installed production dependency tree after lockfile regeneration. Further targeted patches/overrides must be evaluated based on this report; avoid blanket `npm audit fix --force`.

## Deployment gate
This new `start` expects compiled artifacts. The staging deployment must **build first** (`npm ci && npm run build`) before executing `npm start`. The current `captain-definition` references a legacy `node/16` template and has not been updated yet: do not deploy this branch with the old unverified template. A Node 20 deployment strategy with an explicit build stage must be tested before promoting.

Do not merge, deploy or touch production/MySQL as part of this branch. Once CI and the production dependency audit are reviewed, repeat MySQL integration and browser tests on isolated staging.
