# LabCheck

LabCheck is a university lab management app for students, teachers, academic-unit admins, and super admins. It includes a React + Vite frontend, an Express API, and a MySQL database.

## Run locally

1. Install Node.js and Docker Desktop, start Docker Desktop, and run `npm.cmd install` in PowerShell (`npm install` works in other terminals).
2. Copy `.env.example` to `.env`. Set private values for `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, and `JWT_SECRET` (at least 32 characters). Do not commit `.env`.
3. For Mailpit, configure `MAIL_HOST=127.0.0.1`, `MAIL_PORT=1025`, `MAIL_REQUIRE_TLS=false`, leave `MAIL_USER` and `MAIL_PASSWORD` blank, and keep the sample `MAIL_FROM`.
4. Start MySQL and Mailpit with `docker compose up -d`. On the first MySQL start, Docker initializes the schema and demo data. The database is stored in a persistent Docker volume.
5. Apply any incremental SQL changes with `npm.cmd run db:migrate`.
6. To give every seeded demo account the same easy local password in PowerShell, run:

   ```powershell
   $env:DEMO_PASSWORD = "demopass"
   npm.cmd run seed:demo-users
   Remove-Item Env:\DEMO_PASSWORD
   ```

   This assigns `demopass` to the 129 seeded demo accounts only when they still have the `demo-hash` placeholder. To deliberately reset those same seed accounts later, add `-- --reset-seeded` to the npm command. The reset mode checks that the seeded demo accounts still match the expected 4 admins, 5 teachers, and 120 students before changing passwords.
7. Start the API with `npm.cmd run dev:api` and the frontend with `npm.cmd run dev` in separate PowerShell terminals. Open the Mailpit inbox at `http://127.0.0.1:8025`.

Vite proxies `/api` requests to the local API. The signup form accepts `@polytechnic.am` addresses. Verification and password-reset codes expire after 15 minutes. Passwords and codes are hashed, and login uses an HTTP-only session cookie.

## Backend features

- Signup, Mailpit/SMTP email verification, verification-code resend, login/logout, and email password reset.
- Admin review of verified student and teacher signup requests, subject offerings, teacher coverage, and offering activation.
- Student lab-change requests and teacher approval/rejection with group-capacity checks.
- Teacher lab creation/edit/delete, persisted file attachments (10 MB each), student lab grades, attendance, exam scores, and midterm locking.
- Role-filtered bootstrap data for student, teacher, and admin dashboards.

Signup infers the role from the university email: `name.tt319-2@polytechnic.am` is a student in `TT319`; addresses without an academic code are teachers. Both roles can log in after email verification without administrator approval. Unknown academic groups are rejected. New students are enrolled automatically into active, unlocked offerings. Before grading or placement requests begin, students are sorted by surname into groups of at most 16; afterward, existing placements are preserved and newcomers fill available unlocked groups.

For existing installations, run `npm run db:migrate -- --file 009_verified_teacher_access.mysql.sql` to release previously pending, verified teacher accounts. Restart the API and Vite after updating. File previews support PDF, common images, and text; other formats remain downloadable.

Run `node scripts/check-signup-placement.js` for rollback-only signup/placement database regression checks.

Lab attachments are stored under `server/storage/uploads` and are excluded from Git. Back up this directory with the database when preserving uploaded materials. For production, configure institutional SMTP, serve the frontend and API on the same HTTPS origin, set `NODE_ENV=production`, and choose durable private file storage.

The seed file's `demo-hash` values are intentionally unusable. `demopass` is a shared, intentionally weak password for local demonstrations only; never use it for real accounts or production.

## Database and validation

The schema is [`database/schema.mysql.sql`](./database/schema.mysql.sql), demo data is [`database/seed.mysql.sql`](./database/seed.mysql.sql), and incremental changes are in [`database/migrations/`](./database/migrations/). See [`database/README.md`](./database/README.md) for the model and business rules.

Run `npm.cmd run lint` and `npm.cmd run build` to validate frontend changes.

To add realistic demo content after loading the SQL seed, run `npm run seed:demo-content`.
This fills the first unlocked Databases lab in each seeded offering with a campus
library assignment, a detailed brief, a 12-book CSV catalogue and a report template.
It also adds six email-verified pending applicants (four students and two teachers)
for the admin approval workflow. These fictional `demo.pending.*@polytechnic.am` accounts have no
usable password. Reruns preserve approval decisions and edited lab descriptions,
avoid duplicate attachments, and skip locked midterms. The command is limited to
the non-production `labcheck` database; source attachments live in `database/demo-files`.
