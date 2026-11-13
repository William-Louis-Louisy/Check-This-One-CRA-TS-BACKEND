# P0 — Dependency hardening (draft)

**This branch is not deployed.** It stacks on `validation/p0-staging-smtp` (PR #25) and on CTO-03b.

## First changes
- Upgrade direct MySQL client from `mysql2@2.3.3` to `3.24.6` (major update requiring MySQL 8 integration tests).
- Upgrade TypeORM from `0.3.11` to compatible `0.3.31` (declares `mysql2: ^2.2.5 || ^3.0.1`) and `reflect-metadata` to `^0.2.2`; do not bypass peer dependency checks.
- Move development tooling `ts-node-dev` and `typescript` into `devDependencies`.
- Keep `reflect-metadata` in production dependencies; TypeORM needs it at runtime.
- Remove the redundant `crypto` NPM package: Node's built-in `crypto` is used directly.
- Change production start from `npm install --dev && ts-node-dev src/app.ts` to `node build/src/app.js`.
- Regenerate the lockfile with Node 20 in GitHub Actions; never hand-edit lockfile integrity hashes.
- Audit the installed production dependency tree after lockfile regeneration. Further targeted patches/overrides must be evaluated based on this report; avoid blanket `npm audit fix --force`.

## Deployment gate
This new `start` expects compiled artifacts. The staging deployment must **build first** (`npm ci && npm run build`) before executing `npm start`. The old CapRover `node/16` template is replaced on this PR by a repository-owned multi-stage Dockerfile using **Node 24 LTS**. Stage one installs the exact lockfile, compiles TypeScript and prunes dev dependencies. Stage two runs compiled JavaScript as the non-root `node` user with production-only dependencies and includes explicit migration runners. The CI `runtime-image` job builds this image and checks real API startup against disposable MySQL 8 before any staging deployment.

Do not merge, deploy or touch production/MySQL as part of this branch. Once CI and the production dependency audit are reviewed, repeat MySQL integration and browser tests on isolated staging.

## Second review — remaining major-version debt

After the first semver-compatible audit pass, 15 production-tree advisories remained (1 critical, 7 high, 5 moderate, 2 low). The critical `tar` exposure comes from `bcrypt@5` via `@mapbox/node-pre-gyp`, which cannot be patched to a safe `tar@7` within its existing dependency ranges.

The next reviewed changes upgrade `bcrypt` to v6 (eliminating the legacy pre-gyp/tar dependency), `jsonwebtoken` to v9 (enforcing HS256 explicitly), and SendGrid mail to v8.1.6 (bringing a newer Axios client). These are distinct major-version changes and require the entire policy, live MySQL, password-hashing/reset, SMTP-capture and browser regression suites before any staging deployment.

## Audit and CI results — 13 November 2026

- Original staging audit: 34 affected (5 critical, 17 high, 5 moderate, 7 low), before the dependency remediations.
- New locked tree: **9 affected (0 critical, 0 high, 5 moderate, 4 low)** according to `npm audit --omit=dev --json` in GitHub Actions.
- This is **not** a proof that all dependency vulnerabilities are gone or that the application is safe to release. Review remaining moderate/low findings, runtime reachability, and the frontend dependency tree separately.
- The temporary branch-only workflow that could commit a new lockfile has been removed after the reproducible lockfile was generated. The existing security workflow now gates high/critical runtime advisories and runs the MySQL 8 integration and migration tests on this branch.
- Rollout still requires a prebuilt Node 20 runtime image / build step. Do not use unverified CapRover `node/16` configuration with the new production `start` command.

## Runtime build (Node 24 LTS)

CapRover's documented `dockerfilePath` selector points to `./Dockerfile`. The old `templateId: node/16` has been replaced in this branch. Node 20 is EOL in 2026, so the deployment target is Node 24 LTS, not Node 20. No database password, JWT secret or other configuration is embedded in the image. These must be supplied as runtime environment variables by CapRover.

The Dockerfile contains no schema migration or TypeORM synchronization step. CI uses `NODE_ENV=test`, `DB_NAME=cto_security_test` and `DB_SYNCHRONIZE=true` **solely** to bootstrap the disposable MySQL database for the runtime smoke test. Production/staging retain `DB_SYNCHRONIZE=false`.

The container listens on 5000; CapRover's configured Container HTTP Port must be 5000. Before staging deployment, verify the image name, environment, health, and status of the existing staging API; never use it to replace production. The base image uses a maintained Node 24 major tag and is not digest-pinned, so a future build may pick up an updated patch: record the resolved image digest in the release evidence.
