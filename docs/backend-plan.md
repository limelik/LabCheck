# Backend implementation plan

## Decisions

- Build a small Node.js and Express API using `mysql2/promise` and parameterized SQL.
- Use the existing MySQL schema. The sole approved compatibility exception is `lab_change_requests_enrollment_fk`: `ON DELETE RESTRICT`, applied and verified on 2026-10-19.
- Keep MySQL as the source of truth for placement, grades, progress, locks, and requests.
- Identify teaching instances by offering ID, including in the React selection state.
- Preserve the current React screens and connect each one only after its API endpoints work.
- Defer attachments as recorded in [backend-todo.md](./backend-todo.md).
- Use existing account/profile rows as the trusted identity roster for signup. Self-selected role or group must match those rows; admins cannot sign up publicly.
- Never authenticate the seed's `demo-hash` placeholder. Use email-based password setup/reset for local activation.

## Order of work

1. Express setup, environment configuration, MySQL pool, common errors, health endpoint.
2. Academic structure and subject reads.
3. Offerings, enrollment placement, teacher coverage.
4. Labs, grades, attendance, exam results, and locks.
5. Lab change requests and dashboard reads.
6. Authentication and authorization, then progressively connect the React UI.
7. Run automated tests and end-to-end checks, and document actual endpoints in [api.md](./api.md).

## Conventions

- JSON under `/api`; one error envelope: `{ "error": { "code": "...", "message": "..." } }`.
- Validate request bodies and IDs, translate database errors to clear 4xx responses, and log unexpected errors without leaking SQL or secrets.
- Use transactions and row locks for multi-row placement, coverage, request decisions, and midterm locks.
- Use environment variables for database, authentication signing secret, SMTP settings, and ports.
- Set each MySQL connection session to UTC, matching the driver's UTC date handling and the API's explicit UTC writes.
- Keep role and ownership checks on the server. The frontend role selection is only a UI hint.
