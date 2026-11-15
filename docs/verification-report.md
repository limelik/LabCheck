# LabCheck implementation and verification — 2026-11-15

**Follow-up status:** the cascade-integrity blocker is now resolved on the existing local MySQL server. The current final runs pass **19 database/API/unit tests, 341 HTTP assertions, eight converging-cascade scenarios, nine Playwright tests, and the separate empty-database bootstrap test**. Production readiness remains unclaimed pending deployment checks.

## 1. Features implemented

Completed student/teacher signup; six-digit SMTP OTP verification and recovery; expiry, replay prevention, attempt limits and resend cooldown; automatic email-group recognition; trusted-roster activation and explicit pending review; deterministic placement/reconciliation; MySQL session persistence/revocation; protected routes and server permissions; administrator provisioning, identity review, search/filter/detail/edit/activation/deactivation/safe permanent deletion; academic catalog CRUD; private attachments; and integration of the active student, teacher and admin screens. Retained grade, attendance, exam, eligibility, request and midterm lock rules. Removed unused mock admin/data prototypes after replacing their intended workflows. Teacher controls wait for result saves to complete so rapid grade/attendance edits cannot overwrite each other from stale form state. Preserved Excel export with a maintained dependency and verified its downloaded workbook contents.

The follow-up audit fixed two reproduced asynchronous UI failures: an earlier anonymous session response could send a successfully logged-in user back to login, and a delayed catalog response could replace the currently selected record type's rows. Session responses are now invalidated by login/logout/expiration; catalog requests are scoped to their selected type, hide stale rows, provide loading/retry feedback, and prevent type changes during saves/deletes. Catalog selects have explicit accessible names. Unknown catalog types, including inherited object-property names, return 404. API startup now rejects unsafe FK settings; `db:check` audits references read-only.

## 2. Important files changed

- Authentication: `server/routes/auth.js`, `server/services/otp.js`, `server/services/identity.js`, `src/context/AuthContext.jsx`, signup/login/verification/recovery pages.
- Administration: `server/routes/accounts.js`, `server/services/account-policy.js`, `server/routes/catalog.js`, `src/pages/admin/ManageAccounts.jsx`, `AcademicCatalog.jsx`, `StudentPlacement.jsx` and admin routes/navigation.
- Academics/security: `server/access.js`, `server/routes/assessment.js`, `server/routes/requests.js`, `server/services/placement.js`, API middleware and client.
- Attachments: `server/routes/attachments.js`, `src/components/LabAttachments.jsx`, teacher/student integration, storage maintenance script.
- Database: `database/migrations/001_identity_sessions_attachments.sql`, migration/bootstrap/test runners. Original schema constraints and triggers were not changed.
- Tests: `server/tests/auth-workflows.integration.test.js`, `identity.test.js`, `bootstrap.integration.test.js`, preserved academic/cascade suites, `tests/e2e/journeys.spec.js`, Playwright configuration and SMTP harness.
- Startup/docs: `README.md`, `docs/api.md`, `docs/backend-plan.md`, `docs/backend-todo.md`, `docs/database-integrity.md`, `.env.example`, package scripts/lockfile and Vite private-directory protections.
- Follow-up integrity checks: `server/services/database-integrity.js`, `server/scripts/check-database.js`, `server/index.js`, `server/tests/database-configuration.test.js`, `server/tests/converging-cascades.integration.test.js`.
- Follow-up browser regressions: `tests/e2e/audit.spec.js`, `src/context/AuthContext.jsx`, `src/pages/admin/AcademicCatalog.jsx`; additional SMTP-failure and attachment-authorization coverage in `auth-workflows.integration.test.js`.

## 3. Authentication verification

Student and teacher signup through React, real SMTP code delivery, OTP submission, activation, correct role redirect, login/logout, refresh and another-tab session persistence passed. Recovery was completed through the browser and SMTP mailbox, then the new password was used to log in. API tests cover wrong passwords, invalid domain/body, public admin signup, duplicate registration, spoofed group ID, wrong institutional role, conflicting name, unverified/pending/disabled/deleted accounts, used/expired/incorrect/exhausted OTPs, resend cooldown, session expiry, replay of a logged-out cookie, reset revocation, CSRF and login rate limiting.

The expanded integration suite delivered **13 messages over actual local SMTP** to its private capture mailbox. It also forced SMTP failure and verified that failed signup leaves no registration/OTP rows, and failed resend preserves the previous challenge unchanged. Browser tests independently delivered registration/recovery messages over SMTP. Delayed real `/auth/me` responses no longer undo a successful login or resurrect a logged-out UI session. No message was sent to the real example student address. Live university-provider delivery and production HTTPS were not tested.

## 4. Academic group verification

All required formats pass normalization/extraction tests and API checks:

| Email | Extracted code |
| --- | --- |
| `lianamelikyan.tt319@polytechnic.am` | `TT319` |
| `name.TT319@polytechnic.am` | `TT319` |
| `name.tt320-2@polytechnic.am` | `TT320` |
| `name.ab123@polytechnic.am` | `AB123` |
| `example.xy456-1@polytechnic.am` | `XY456` |

The browser displayed automatic `TT319` detection with no group selector. Registration used disposable addresses and roster rows. Extraction alone never creates or recognizes a group: unmatched codes/identities remained pending after verification. Missing-group and wrong-domain handling passed. Hyphen suffixes are removed regardless of their contents, including multiple hyphens and nonnumeric suffixes. Mixed-case addresses and spoofed group IDs were tested. Existing trusted names were preserved after authorized review.

## 5. Placement verification

Unit tests confirm stable surname/given-name/ID sorting, round-robin allocation independent of input order, and refusal of insufficient capacity. Database tests created **33 students**, two offerings, and three subgroups; both offerings placed exactly **11 students in each subgroup** with the expected surname order. Concurrent cohort reconciliations preserved 33 unique enrollments per offering. Repeated login did not change enrollment IDs/current/default placements. Missing configuration produced a visible pending-review reason. Existing capacity tests rejected the seventeenth student in a subgroup. Approved lab changes preserved original/default placement.

## 6. Admin verification

API and browser tests exercised search/filter/detail, trusted provisioning, verified pending-student approval, rejection, deactivation and failed subsequent login, reactivation, eligible permanent deletion, repeated deletion rejection and revoked deleted-account sessions. Protected deletion was blocked and the UI named enrollment, grade/attendance, exam and request dependencies; academic rows remained present. Self-deactivation/deletion and unauthorized/scoped-admin requests were rejected. The policy test separately verifies last-active-admin and last-super-admin safeguards; destructive backend operations serialize active-admin rows under locks. An empty-database test verified first-admin provisioning and refusal once an admin exists.

## 7. Dashboard verification

Nine Playwright tests passed against the actual React/Express/MySQL application on the repaired existing server:

1. Student signup/group detection/OTP/placement/subjects, refresh, another tab, protected-route redirect, lab-change request, logout.
2. Teacher signup/assignments/roster, lab creation, permitted grades/attendance/exam, persistence, upload/student download/deletion, request approval, absence eligibility, Excel export, and locked read-only controls.
3. Administrator pending review, trusted identity provisioning, approval, deactivation, eligible deletion and protected-history refusal.
4. SMTP recovery, invalid-code feedback, mobile viewport, session expiry, and a deliberately injected API failure displayed in React. This last failure UI check uses a controlled 503 response; the successful workflows use real MySQL.
5. Catalog subject creation, offering creation, teacher coverage, refresh persistence and placement reconciliation.
6. A delayed anonymous session check cannot overwrite a successful login.
7. A delayed catalog response cannot replace rows from the currently selected catalog type.
8. A delayed authenticated session check cannot restore the UI after logout; the server rejects the revoked session.
9. Browser creation of a department, specialization, academic group, lab subgroup and subject; name correction; refusal of dependent-parent deletion; reverse-order permanent deletion of unused configuration, verified through API reads.

The race tests delay real API responses rather than substituting fabricated records. The route/component audit found no remaining routed mock datasets or silent no-op controls. Explicit policy restrictions (locked-result corrections, historical transfers and protected-history deletion) remain explained errors/read-only actions. Attachment tests now also verify unrelated students/teachers cannot list/download files or upload into an unauthorized offering, and missing physical files return a controlled `FILE_UNAVAILABLE` response. This is evidence for the listed workflows, not a claim that every possible browser/device/deployment combination was exercised.

Desktop and mobile screenshots were visually inspected. Tables on small screens scroll horizontally inside their containers. Artifacts: [student](../outputs/verification/student-dashboard.png), [mobile](../outputs/verification/student-mobile.png), [teacher lock/eligibility](../outputs/verification/teacher-locked-results.png), [protected deletion](../outputs/verification/admin-protected-deletion.png).

## 8. Executed checks

| Command | Actual result |
| --- | --- |
| `npm run lint` | Passed |
| `git diff --check` | Passed |
| `npm run build` | Passed; ExcelJS is a large lazy-loaded export chunk and produces a bundle-size warning |
| `node server/scripts/test-database.js node --test server/tests/database-integrity.integration.test.js` before repair | Reproduced the original failure: orphan second-midterm lab |
| Persistent native FK configuration + `RESTART` | Applied successfully on the existing server; settings loaded from `mysqld-auto.cnf`, FK checks stayed ON |
| `npm run test:db` after repair and audit fixes | **19 passed, 0 failed, 0 skipped**; **190 existing + 151 expanded API assertions = 341**, actual SMTP, original regression, eight converging-cascade scenarios and orphan audit |
| `npm run test:bootstrap` | **1 passed** on an empty disposable database on the repaired server |
| `npm run test:e2e` | **9 passed, 0 failed**; real SMTP/MySQL and UI race regressions |
| `npm run db:check` | **36 FKs, zero orphans, RESTRICT preserved**, native mode and both global/session checks ON |
| Pre/post-restart and final data/schema comparison | All **26 table data/schema hashes and 19 triggers unchanged** |

Saved current evidence: [integration log](../outputs/verification/integration-shared.log), [browser log](../outputs/verification/browser-shared.log), [bootstrap log](../outputs/verification/bootstrap-shared.log), [FK audit](../outputs/verification/database-audit.json), [persistent-setting/data verification](../outputs/verification/repair-validation.json). The before-fix UI reproductions are retained in `audit-login-before.log` and `audit-race-before.log`. All reproduced failures are covered by passing regressions in the final run. Earlier implementation verification also completed `npm ci`, a zero-vulnerability dependency audit and isolated native-server suites; dependencies did not change in this follow-up. Playwright produces an ignored local `playwright-report` and failure traces when needed.

Development data remains **24 accounts, 15 students, 12 offerings, 33 enrollments, 48 labs**. `lab_change_requests_enrollment_fk` remains **RESTRICT**. The read-only audit found **zero orphan rows across all 36 foreign keys**. All workflow fixtures used randomly named disposable databases, which the runners drop after completion; the real development accounts were not activated or altered by testing. No schema migration was needed for this repair.

## 9. Remaining external requirements

The local database blocker is **resolved**: MySQL 26.7.0 now uses persistent native InnoDB FK handling on the existing server. Its runtime implementation caused the failure; the same binary/schema passes after the configuration change. Each production deployment or version upgrade must independently pass the full suite and `db:check`; this startup option is deprecated upstream and must not be assumed available forever. No offering-delete API was added. [Detailed cause and applied repair](database-integrity.md).

Production still needs approved institutional roster/coverage data, actual SMTP credentials/sender and deliverability verification, HTTPS/Secure-cookie deployment, least-privilege DB users, durable private storage/backups, and operational recovery/load tests. Multi-instance API deployment requires shared rate-limit storage. Retention/anonymization, historical group transfers and locked-result corrections require institutional policy and remain explicit blocked/read-only workflows.

## 10. Final status

The existing local MySQL server's integrity regression is resolved, original academic data/schema/constraints are preserved, and the expanded API/integrity/browser suites pass with no skipped database tests. Reproduced application audit issues were fixed and regression-tested. **The project is not declared production-ready:** live production SMTP/HTTPS, approved institutional data and operational deployment checks remain unconfigured or unverified. The original cascade regression remains enabled and passing.
