# LabCheck

LabCheck is a university lab management app for students, teachers, academic-unit admins, and super admins.

## Run locally

Install dependencies with `npm install`. Start MySQL on macOS with `brew services start mysql` (or start your existing MySQL server). Copy `.env.example` to `.env`, then set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a persistent random `AUTH_SECRET` of at least 32 characters. For example, generate the secret with `openssl rand -hex 32` and paste it into `.env`. Keep `.env` out of Git.

If the database is empty, the intended import commands are:

```sh
mysql -u root -p < database/schema.mysql.sql
mysql -u root -p < database/seed.mysql.sql
```

The full schema and seed were imported successfully on MySQL 26.7.0 on 2026-10-19. The approved compatibility change sets only `lab_change_requests_enrollment_fk` to `ON DELETE RESTRICT`. See [docs/api.md](./docs/api.md) for verified behavior and testing limits. `/api/health` checks connectivity, not the presence of every database object.

Run these in separate terminals:

```sh
npm run dev:api
npm run dev
```

The frontend is at `http://localhost:5173`; the API is at `http://localhost:3001`. Vite forwards `/api` requests to Express. Run `npm test`, `npm run lint`, and `npm run build` for the available automated checks.

Run `npm run test:db` for all core API routes against an imported local seed database. Set `DEV_MAILBOX_DIR` and leave SMTP disabled for this test. It temporarily modifies designated seed accounts and creates fixtures, then restores/removes them; use a development database. See the verification details in [docs/api.md](./docs/api.md).

The core API suite passes, but the full database test command currently reports one unresolved nested cascade integrity failure for direct offering deletion (which has no API endpoint). The reproduction is kept as a failing test. See [docs/backend-todo.md](./docs/backend-todo.md).

### Seeded account activation

The sample accounts use `demo-hash`, which the API never accepts as a password. For local development, set `DEV_MAILBOX_DIR=.local-mailbox` in `.env` if SMTP is unavailable. The server writes verification and reset messages there with private file permissions. In the login screen, choose **Forgot password?**, enter a seeded address such as `milena.simonyan@polytechnic.am` or `root.admin@polytechnic.am`, read the newest message in `.local-mailbox`, and enter its eight-digit code and a new password. The administrator login email field is editable. Alternatively, the signup form can activate a matching pre-provisioned student or teacher identity by sending an email verification link. Never use `demo-hash` itself as a password.

An existing account/profile row is the temporary trusted roster. The entered role, name, email, and student academic group must match it. New, unrecognized people cannot self-assign a role or group. For actual email delivery, set the `SMTP_*` variables and leave `DEV_MAILBOX_DIR` unset.

## Database

MySQL is the database. The schema is [`database/schema.mysql.sql`](./database/schema.mysql.sql), the demo data is [`database/seed.mysql.sql`](./database/seed.mysql.sql), and the current business rules are in [`database/README.md`](./database/README.md).

The active React screens call the Express API, which uses MySQL as the source of truth. See [docs/backend-plan.md](./docs/backend-plan.md) for architecture, [docs/api.md](./docs/api.md) for routes and verification results, and [docs/backend-todo.md](./docs/backend-todo.md) for deferred work.
