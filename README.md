# LabCheck

React, Express, and MySQL university laboratory management. MySQL stores identities, sessions, registrations, placement, teaching coverage, assessments, requests, and attachment metadata. Private files live on the server filesystem.

## Local setup

Use Node.js 22+ and MySQL. Verification on 2026-11-15 used Node 26.11.1 and MySQL 26.7.0.

```sh
npm ci
cp .env.example .env
openssl rand -hex 32
```

Put the generated value in `AUTH_SECRET` in `.env`; configure your MySQL connection. Never commit `.env`. Only for an **empty** database:

```sh
mysql -u root -p < database/schema.mysql.sql
# Optional demonstration roster, never a real institutional roster:
mysql -u root -p < database/seed.mysql.sql
```

Apply the additive migration to your configured database:

```sh
npm run db:migrate
npm run db:check
```

The migrations add registration, OTP, session, audit, attachment, and cleanup tables, then update the enrollment capacity and lab validation messages. Lab groups allow one overflow seat (17 students), so 33 students are balanced into groups of 17 and 16. Other academic protections, foreign keys, and the enrollment deletion restriction remain intact. DDL uses a migration ledger and resumable `CREATE TABLE IF NOT EXISTS`. Back up existing databases before any deployment migration.

Start the frontend and API:

```sh
npm run dev
```

Keep MySQL running separately. Press `Ctrl+C` to stop both development services. If any service exits, the others stop too. To run services individually, use `npm run dev:web`, `npm run dev:api`, or `npm run dev:mail`.

Open [LabCheck](http://localhost:5173). Vite proxies `/api` to Express on port 3001. `PUBLIC_URL` must exactly match the browser origin for write requests. Real signup and password reset require `EMAIL_DELIVERY=smtp` (the default), `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and your provider’s `SMTP_USER` / `SMTP_PASSWORD` credentials in `.env`. Use a sender address approved by that provider. SMTP requires TLS. Missing configuration produces an explicit delivery error; it never silently saves a code locally. Restart the API after changing `.env`. For isolated testing only, set `EMAIL_DELIVERY=capture`; the test runners do this automatically. `dev:mail` is an optional loopback capture server and is no longer started by `npm run dev`.

Each midterm allocates 16 lab points plus 4 exam points. Labs can be worth 1–16 points each, so a course can have four labs in the first midterm and three in the second (for example, 6 + 5 + 5). On the subject page, the first midterm stays “open” until the teacher starts the second midterm, then shows “locked”. Individual lab-group progress pages keep their own lock/unlock state.

### Demonstration coursework

After loading the optional demonstration roster and applying migrations, run `npm run demo:coursework` on the local development database. This adds a database-design assignment and a private TXT brief, completes missing Web Development first-midterm sample results, locks that midterm, and creates eight second-midterm labs. Milena's second-midterm sample total is 14/16 lab points plus 3/4 exam points. Existing nonempty first-midterm grades are retained; a JSON snapshot is saved in a temporary directory before changes. This command is explicit, repeatable, and never runs during application startup or migration.

The sample TT319 Physics course is marked inactive. Student home, assignments, requests, progress, and counts show only subjects marked active by an administrator; academic years and semesters remain available in administration.

### Account setup

For an empty institutional database without any administrator, a trusted operator can run `npm run admin:bootstrap -- <university-email> <first-name> <surname>` after migration. This refuses to run once any administrator exists. It creates no usable password; complete email OTP recovery to activate it.


There is no usable demo password. `demo-hash` is never authenticated.

- An existing **approved** admin can set a password using **Forgot password?**, the SMTP mailbox code, and a new password. The demo seed includes `root.admin@polytechnic.am`. Actual administrators must be institutionally provisioned; public admin signup is rejected.
- Admin **Accounts & Registration Review** can provision trusted student/teacher identities. Provisioned student/teacher accounts remain pending until signup and OTP verification. Admin creation requires a super administrator and an explicit administrative scope.
- A student signs up with names, university email, and password. The group is detected from the final dotted email segment, removing the first hyphen and everything after it, and matched to an existing group. There is no student group/subgroup selector. Verification automatically creates and activates the student account; no pre-provisioned roster identity is required.
- A teacher signs up with names, university email, and password. Verification automatically creates and activates the teacher account without administrator approval. Existing authorized teaching assignments appear automatically; new teachers start without assignments.
- Existing account roles, disabled/rejected status, and roster names are preserved. An unknown student email group or conflicting existing account still requires correction. Missing course configuration does not block login; enrollment is completed when the academic configuration is ready.
- Demo student addresses predate the group-suffix convention. Their existing verified roster identities can use password recovery for legacy access. New signup requires a group-bearing institutional address; do not change real institutional emails just to bypass review.

## Verification commands

```sh
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:db
npm run test:e2e
# With mysqld available on PATH, use a fully separate temporary server:
npm run test:db:native
npm run test:e2e:native
```

Database/browser runners create a randomly named `labcheck_test_*` database, import fixtures, apply migrations, run tests, then drop **only that database**. They require a test DB credential with CREATE/DROP DATABASE privileges; use a development server. They never activate or rewrite accounts in the configured development database. Direct integration-test invocation is refused without the isolation marker. Native runners initialize a separate temporary server/data directory, enable native FK handling, and shut it down afterward. They do not restart or reconfigure your server.

**Database compatibility:** the installed MySQL 26.7.0 server was repaired by persisting `innodb_native_foreign_keys=ON` and restarting it. All 26 table data/schema hashes and 19 triggers stayed unchanged. `npm run test:db` now passes the original cascade regression and the expanded converging-path/RESTRICT matrix on this server. `npm run db:check` audits all foreign keys for orphans without modifying records. API startup refuses disabled FK checks or runtime FK handling. No offering-delete endpoint exists; catalog/account deletion continues to protect academic history. See [cause, repair and deployment checks](docs/database-integrity.md).

Playwright exercises the actual React UI and MySQL, with OTP messages delivered by SMTP to the test mailbox. Additional audit tests cover delayed session/catalog responses and catalog hierarchy CRUD. Detailed current results are in [verification report](docs/verification-report.md).

## Production requirements

- Use a MySQL version/configuration that passes the full integrity suite. For the tested 26.7.0 workaround, configure `innodb_native_foreign_keys=ON` at server startup; this needs an operator-managed restart and compatibility review. The app does not alter that global setting.
- Use a dedicated runtime database user with SELECT/INSERT/UPDATE/DELETE on the application schema; use separate migration/test credentials for DDL. Do not deploy with root credentials.
- Set `NODE_ENV=production`, `COOKIE_SECURE=true`, a strong stable `AUTH_SECRET`, and an HTTPS `PUBLIC_URL`. Reverse-proxy `/api` and serve `dist` from the same origin with SPA fallback. Do not publicly expose the development server. Configure `TRUST_PROXY` only for the actual proxy IP/CIDR (for example `loopback` for a same-host proxy), and make that proxy overwrite forwarded client-IP headers so rate limits identify the actual client.
- Configure a real SMTP host, port, sender and credentials. TLS is required in production. Outbound university delivery has **not** been tested here. OTPs expire in ten minutes, allow five incorrect attempts, and have a sixty-second resend cooldown.
- Mount durable private `UPLOAD_DIR` outside the web root, set its access permissions, configure upload limits, and back it up with MySQL. Supported files: PDF, TXT, PNG, JPEG. Files are downloaded as attachments, never executed or served as a public directory. The allowlist/signature checks are not antivirus scanning.
- Run `npm run storage:maintain` under your operational scheduler to retry deleted-file cleanup, remove unreferenced generated files older than one hour, and remove expired sessions. Coordinate storage cleanup with backups and use a single shared storage location if running multiple API instances.
- Supply approved institutional roster/configuration data. Agree on retention and formal transfer/correction rules before offering anonymization, historical group transfers, or locked-result corrections. These actions are explicitly blocked; deactivation retains history and is never described as permanent deletion.
- Rate limits currently use a per-process store. A multi-instance deployment must provide a shared rate-limit store; database OTP attempts/cooldowns and session revocation remain shared already. Load testing, failover, backup recovery, live SMTP and production HTTPS remain deployment checks.

See [API](docs/api.md), [architecture](docs/backend-plan.md), and [remaining work](docs/backend-todo.md).

Account history: Admin account details include **Delete login, keep history** for students and teachers. This revokes sessions, clears credentials and registration challenges, and releases the email for a fresh signup. The archived profile and its academic records remain under the original ID; new signup does not inherit those records. Archived logins cannot be reactivated.
