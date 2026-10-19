# Implemented API

All routes use JSON under `/api`. The Vite development server proxies `/api` to the Express server. Authentication uses the HTTP-only `labcheck_session` cookie. IDs are numeric database IDs. Errors have the form `{ "error": { "code": "...", "message": "..." } }`.

**Verified locally on 2026-10-19 against MySQL 26.7.0.** All 34 method/path combinations below passed database-backed tests. The full schema and seed imported successfully after the approved change of `lab_change_requests_enrollment_fk` to `ON DELETE RESTRICT`. The database contains all 19 tables, 1 view, 19 triggers, named constraints, and indexes from the schema (including 30 foreign keys).

**One separate database integrity check fails:** deleting a disposable offering with labs in both midterms leaves a second-midterm lab row after its parent midterms are removed. The declared nested cascade does not complete on the available server. Offering deletion is not an implemented API operation. No additional constraint was changed; the failure is reproducible in `server/tests/database-integrity.integration.test.js` and tracked in [backend-todo.md](./backend-todo.md).

## Public and account endpoints

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/health` | — | `{status:"ok",database:"connected"}` if MySQL responds; this does not verify all tables |
| GET | `/api/auth/academic-groups` | — | `[{id,code,name}]` for the signup selector |
| POST | `/api/auth/signup` | `{firstName,lastName,email,password,role,academicGroupId?}` | `202 {message}`; identity must already exist in account/profile tables |
| POST | `/api/auth/verify-email` | `{token}` | `{verified:true}` |
| POST | `/api/auth/login` | `{email,password,role?}` | `{user:{id,email,role,profileId,adminLevel?,academicUnitId?,firstName,lastName}}` and session cookie |
| GET | `/api/auth/me` | Session cookie | `{user}` |
| POST | `/api/auth/logout` | — | `204` and cleared cookie |
| POST | `/api/auth/password-reset/request` | `{email}` | Generic `{message}` to avoid account enumeration |
| POST | `/api/auth/password-reset/confirm` | `{email,code,newPassword}` | `{reset:true}` |

Only student and teacher profiles can use public signup. Admin identities must already exist. `demo-hash` is never accepted for login. Seeded accounts can set a password using the reset flow and a configured SMTP server or development mailbox.

## Academic and administrative endpoints

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/academic-structure` | — | `{units,specializations,groups,labGroups}`; groups include `studentCount`, `recommendedLabCount`, `labGroupIds` |
| GET | `/api/subjects` | — | `[{id,code,name}]` |
| GET | `/api/teachers` | Admin | `[{id,firstName,lastName,email}]` |
| GET | `/api/offerings` | Role-scoped | `[{id,subjectId,subjectCode,subjectName,academicGroupId,academicGroupCode,academicYear,semester,isActive,totalGrade}]` |
| POST | `/api/offerings` | Admin `{subjectId,academicGroupId,academicYear,semester}` | `201` offering; creates two midterms and places eligible students transactionally |
| PATCH | `/api/offerings/:id` | Admin `{isActive}` | Updated offering |
| GET | `/api/offerings/:id/enrollments` | — | `[{id,studentId,firstName,lastName,offeringId,labGroupId,defaultLabGroupId}]` |
| GET | `/api/offerings/:id/coverage` | — | `[{id,teacherId,labGroupId,firstName,lastName}]` |
| PUT | `/api/offerings/:id/coverage` | Admin `{teacherId,mode:"all"|"split",labGroupIds?}` | `{assignedCount}` |
| GET | `/api/admin/dashboard` | Admin | Counts and `offeringSummaries` |
| GET | `/api/academic-groups/:id/lab-groups` | — | `[{id,academicGroupId,code}]` |

## Labs, assessment, and requests

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/offerings/:id/midterms` | — | Two rows `{midtermNo,status,lockedAt,lockedByTeacherId,assignedPoints,labs:[...]}` |
| POST | `/api/offerings/:id/midterms/:no/labs` | Teacher `{title,description?,difficulty}` | `201` lab with server-assigned `labNumber` |
| PATCH | `/api/labs/:id` | Teacher `{title,description?,difficulty}` | Updated lab fields |
| DELETE | `/api/labs/:id` | Teacher | `204`; existing database cascade removes results for that open lab |
| GET | `/api/offerings/:id/midterms/:no/progress?labGroupId=…` | Teacher/admin | Student rows with grades, attendance, exam score and derived progress |
| PUT | `/api/labs/:labId/results/:enrollmentId` | Teacher `{grade:null|0..5,attendance:"PRESENT"|"ABSENT"|"EXCUSED"|"UNMARKED"}` | Saved result; database enforces the lab's actual maximum |
| PUT | `/api/offerings/:id/midterms/:no/exam-results/:enrollmentId` | Teacher `{examScore:null|0..4}` | Saved exam score |
| POST | `/api/offerings/:id/midterms/:no/lock` | Teacher | `{offeringId,midtermNo,status:"LOCKED"}`; database checks completeness and point total |
| GET | `/api/lab-change-requests?status=…&offeringId=…` | Role-scoped | Newest-first request rows |
| POST | `/api/enrollments/:id/lab-change-requests` | Student `{requestedLabGroupId}` | `201` pending request |
| PATCH | `/api/lab-change-requests/:id` | Teacher `{decision:"APPROVED"|"REJECTED"}` | Decided request; database trigger moves placement on approval |
| GET | `/api/students/me/enrollments` | Student | Own offerings and current/default placement |
| GET | `/api/students/me/progress` | Student | Own midterm progress and lab rows |
| GET | `/api/teachers/me/assignments` | Teacher | Own offering and lab-group assignments |

All protected endpoints verify current account status. Academic-unit admins are scoped to their unit; teachers need assignment to the offering, and grade writes also require assignment to the student's current lab group; students can access only their own enrollments. The database remains authoritative for capacity, lock, grading, and request constraints.

Attachments are intentionally absent; see [backend-todo.md](./backend-todo.md).

## Verification results

| Area | Result | Evidence |
| --- | --- | --- |
| Every documented API method/path | Passed | `server/tests/api.integration.test.js`: 201 HTTP checks against MySQL; successful responses and rejected operations |
| Signup and email verification | Passed via API | Existing identity required; unknown identities, mismatched roles, and admin signup rejected; verified identity can log in |
| Seed account activation and password reset | Passed via API | Development mailbox supplies reset code; random new password works; `demo-hash` cannot log in |
| Authentication and authorization | Passed | Missing, forged, and expired sessions rejected; disabled/unverified/rejected accounts rejected; role, offering, student ownership, teacher lab group, and academic-unit scope checked; auth rate limit checked |
| Offering/enrollment/coverage workflow | Passed | Create, duplicate prevention, automatic placement, active status, all/split teacher coverage, and dashboard reads |
| Lab change workflow | Passed | Submit, one pending request, approve, reject, history, preserved default placement, 16-student target capacity, and enrollment deletion restriction |
| Labs and assessment | Passed | Create/edit/delete, cascaded result deletion, maximum 14 labs, grade and exam ranges, per-midterm 16-point allocation, completeness before locking, both midterms, and rejection of locked writes |
| Derived progress | Passed | Saved grades, exam scores, absence count, three-absence exclusion, and overall points returned from the database view |
| Admin React workflow | Passed in browser | Login, create offering, assign coverage, refresh and see persisted changes |
| Teacher React workflow | Passed in browser | Login, create lab, save grade/attendance/exam, decide requests, lock a complete first midterm, refresh and see read-only controls |
| Student React workflow | Passed in browser | Login, see teacher changes, submit request, see approval/rejection and changed placement after refresh; unauthorized admin route redirects |
| Frontend state after writes | Passed in browser | Submission and decision keep the current screen open during background refresh |
| Parent offering deletion cascade (direct SQL; no API endpoint) | Failed | Minimal reproduction leaves a second-midterm lab without its midterm parent; `foreign_key_checks=1`, and `SHOW CREATE TABLE` confirms both declared cascade actions |
| Live SMTP; browser signup/reset submission; production HTTPS/Secure cookies; concurrent load | Untested | Development mailbox and local HTTP were used; no load test or deployment was performed |

Verification fixed three integration issues: MySQL sessions now use UTC so SQL timestamp defaults agree with explicit UTC writes; background refreshes no longer unmount the current React screen; offering labels include academic year and request rows display lab codes.

After all test cleanup, a read-only audit across all 30 foreign keys found zero orphan rows. The local database was restored to the imported seed counts: 24 accounts, 15 students, 12 offerings, 33 enrollments, 48 labs, and zero lab change requests. The two expired reset tokens supplied by the seed were preserved for their original accounts.

Run the database suite only against a local development database loaded with this repository's seed, with `DEV_MAILBOX_DIR` configured and SMTP disabled:

```sh
npm run test:db
```

The API suite temporarily activates seed accounts 1, 2, 4, 5, and 10 with generated passwords, creates an offering in reserved year `2098-2099`, and creates capacity fixtures. The integrity suite creates a disposable offering in `2095-2096`. Both restore/remove their fixtures, including explicit removal of any labs left by the failed nested cascade. They do not overwrite an existing offering in those reserved years. `npm run test:db` currently exits with failure because it includes the unresolved integrity assertion; the core API suite passes. Run only the API verification with `RUN_DB_TESTS=1 node --test server/tests/api.integration.test.js`. `npm test` runs the unit tests and skips database suites unless `RUN_DB_TESTS=1` is set. The full run, `RUN_DB_TESTS=1 npm test`, has five passing tests and one failing integrity test. Browser-test fixtures and temporary passwords were removed after the verification session; the imported seed data remains available.
