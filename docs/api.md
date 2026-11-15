# LabCheck API

All paths are under `/api`; JSON errors are `{ "error": { "code": "...", "message": "..." } }`. Requests use the `labcheck_session` HttpOnly cookie. All mutation requests require `X-LabCheck-Request: 1`; a supplied Origin must equal `PUBLIC_URL`. No permissive CORS is enabled. IDs are positive integers, bodies are strict (unexpected properties are rejected), and server authorization uses the authenticated database role.

## Authentication

| Method | Path | Body / query | Result |
| --- | --- | --- | --- |
| GET | `/health` | — | Connectivity check; not an integrity certification |
| GET | `/auth/detect-group?email=…` | University email | `{code,recognized,message}`; recognition requires a MySQL group |
| GET | `/auth/academic-groups` | — | Existing `{id,code,name}` list retained for compatibility; signup has no selector |
| POST | `/auth/signup` | `{firstName,lastName,email,password,role:"student"|"teacher"}` | 202; pending registration and six-digit OTP email |
| POST | `/auth/resend-verification` | `{email}` | Generic message; 60-second cooldown; previous code invalidated |
| POST | `/auth/verify-email` | `{email,code}` | `{verified:true,status:"APPROVED"|"PENDING",message}` |
| POST | `/auth/login` | `{email,password,role?}` | `{user}` and new session cookie; optional role is ignored as authority |
| GET | `/auth/me` | Cookie | `{user}`; current account/group identity |
| POST | `/auth/logout` | — | 204; session revoked in MySQL, cookie cleared |
| POST | `/auth/password-reset/request` | `{email}` | Generic message and OTP if identity exists |
| POST | `/auth/password-reset/confirm` | `{email,code,newPassword}` | `{reset:true,message}`; credential change and all account sessions revoked |

`user` includes `id,email,role,profileId,adminLevel,academicUnitId,firstName,lastName,academicGroupId,academicGroupCode` where applicable. No hashes, OTPs, challenge identifiers, or secrets are returned. `demo-hash` is never accepted. Passwords use bcrypt cost 12, at least 8 characters, at most 72 UTF-8 bytes (preventing silent bcrypt truncation).

Email is trimmed/lowercased and must match `UNIVERSITY_DOMAINS`. Student group extraction takes the final dotted local segment, removes the first hyphen and everything after it, and uppercases the remaining code. Prefix, digit length and hyphen-suffix contents are not restricted by extraction. Missing or database-unmatched codes produce an unrecognized group; wrong domains/invalid addresses are rejected. Frontend group IDs/codes are rejected by strict signup validation. The existing schema's domain constraint still permits only `polytechnic.am` account rows.

Verification/recovery OTPs have separate purposes, keyed hashes salted by random challenge IDs, ten-minute expiry, five wrong attempts, and single-use consumption under row locks. Incorrect attempts persist even when the API returns an error. Expired, incorrect, exhausted, used and rejected-registration cases have distinct safe error codes. Signup never changes trusted profile details. Only matching eligible identities activate automatically. Unknown/mismatched identities and placement problems remain verified/pending; they cannot log in. Recovery never approves a pending/rejected identity or activates a disabled account. Legacy link tokens are not accepted by the OTP endpoint. Deployment invalidates old JWT sessions; users log in again to obtain revocable database sessions.

## Academic reads and offerings

| Method | Path | Permissions / body |
| --- | --- | --- |
| GET | `/academic-structure` | Authenticated; scoped unit/specialization/group/subgroup hierarchy and roster counts |
| GET | `/subjects` | Authenticated subject catalog |
| GET | `/teachers` | Admin; teacher profiles/status (assignment picker filters to active approved identities) |
| GET | `/offerings` | Role-scoped offering list |
| POST | `/offerings` | Admin `{subjectId,academicGroupId,academicYear,semester}`; creates midterms, required subgroups and deterministic cohort enrollments |
| PATCH | `/offerings/:id` | Scoped admin `{isActive}` |
| GET | `/offerings/:id/enrollments` | Accessible offering; student receives only own enrollment |
| GET | `/offerings/:id/coverage` | Accessible offering teacher coverage |
| PUT | `/offerings/:id/coverage` | Scoped admin `{teacherId,mode:"all"|"split",labGroupIds?}` |
| GET | `/academic-groups/:id/lab-groups` | Authenticated subgroup list |
| GET | `/admin/dashboard` | Scoped admin persisted counts and offering summaries |
| POST | `/admin/academic-groups/:id/reconcile` | Scoped admin; fills missing cohort enrollments without overwriting current/default placements |
| GET | `/students/me/enrollments` | Student's own offerings/current/default subgroup codes |
| GET | `/students/me/progress` | Student's own grades, attendance, exams, totals, eligibility and lock status |
| GET | `/teachers/me/assignments` | Teacher's persisted offerings/subgroups |

There is deliberately **no offering-delete endpoint**. Maximum subgroup size is the existing academic rule of 16; there is no unsupported configurable-capacity override. Reconciliation fails explicitly for missing configuration/full deterministic targets/late enrollment into locked offerings. Login does not reassign students.

## Assessment and requests

| Method | Path | Permissions / body |
| --- | --- | --- |
| GET | `/offerings/:id/midterms` | Accessible offering; both midterm states/labs/assigned points |
| POST | `/offerings/:id/midterms/:no/labs` | Assigned teacher `{title,description?,difficulty:1..5}` |
| PATCH | `/labs/:id` | Assigned teacher; same fields; open midterm |
| DELETE | `/labs/:id` | Assigned teacher; open midterm, no attachments; existing direct result cascade |
| GET | `/offerings/:id/midterms/:no/progress?labGroupId=…` | Teacher/admin; teacher rows limited to current subgroup coverage |
| PUT | `/labs/:labId/results/:enrollmentId` | Current assigned teacher `{grade:null|0..5,attendance:"PRESENT"|"ABSENT"|"EXCUSED"|"UNMARKED"}`; grade cannot exceed lab difficulty |
| PUT | `/offerings/:id/midterms/:no/exam-results/:enrollmentId` | Current assigned teacher `{examScore:null|0..4}` |
| POST | `/offerings/:id/midterms/:no/lock` | Assigned teacher; database validates all enrolled students, 16 lab points, grades/attendance/exams and first-before-second ordering |
| GET | `/lab-change-requests?status=…&offeringId=…` | Role-scoped history |
| POST | `/enrollments/:id/lab-change-requests` | Owning student `{requestedLabGroupId}` |
| PATCH | `/lab-change-requests/:id` | Teacher authorized for offering `{decision:"APPROVED"|"REJECTED"}` |

Existing offering-level request decision authorization is retained. Grade/exam writes additionally require current subgroup coverage. All teaching writes recheck coverage while holding the offering transaction lock, serializing them with coverage edits, placement decisions and locks. Locked results are read-only. Approved requests update current placement while preserving the default; history is retained and enrollment deletion remains restricted.

## Account administration

| Method | Path | Body / result |
| --- | --- | --- |
| GET | `/admin/accounts?search=…&role=…&status=…` | Roles STUDENT/TEACHER/ADMIN; status PENDING/APPROVED/REJECTED/INACTIVE |
| GET | `/admin/accounts/:id` | Profile/status and explicit protected dependency counts |
| POST | `/admin/accounts` | Super admin `{firstName,lastName,email,role,academicGroupId?,adminLevel?,academicUnitId?}`; trusted provisioning, no password supplied |
| PATCH | `/admin/accounts/:id` | `{isActive?,firstName?,lastName?,academicGroupId?}`; scope/identity/history checks, audit and revocation |
| DELETE | `/admin/accounts/:id` | `{confirmEmail}`; explicit matching confirmation and dependency checks |
| GET | `/admin/registrations` | Super admin; submitted identity, detected group, verified/status/review reason; no password hash |
| PATCH | `/admin/registrations/:id` | Super admin `{decision:"APPROVED"|"REJECTED"}`; approval requires verified email, a trusted matching identity and valid placement |

Unit admins can manage student accounts in their own unit. Super admins manage teachers, other admins, global reviews and provisioning. Administrator scope is SUPER_ADMIN or ACADEMIC_UNIT_ADMIN with an academic unit. A current admin cannot deactivate/delete itself; active-admin locks serialize destructive decisions and protect the last active administrator/super administrator. Institutional roles cannot be changed through arbitrary profile fields.

Provisioned student/teacher identities remain pending until signup/verification/approval; newly provisioned admins use authorized email OTP password setup. Unknown public registrations never create account/profile/group rows automatically. A name discrepancy can be approved by an admin while preserving the trusted name. A group/email discrepancy cannot be bypassed by selecting another group.

Deletion refuses enrollment, lab grades/attendance, exam, request, coverage, lock and protected audit/reviewer dependencies. Eligible deletion removes profile/credentials/OTP/registration/session records transactionally and records a deletion audit without retaining credentials. Ineligible accounts may be deactivated; there is no misleading soft-delete response or automatic erasure of academic history. Permanent deletion repeated after success returns 404.

## Academic catalog management

Super-admin routes:

- `GET /admin/catalog/:type` — records.
- `POST /admin/catalog/:type` — create.
- `PATCH /admin/catalog/:type/:id` — validated replacement of editable fields.
- `DELETE /admin/catalog/:type/:id` — only unreferenced configuration.

| Type | Required fields |
| --- | --- |
| `units` | `{code,name,unitType:"INSTITUTE"|"FACULTY"}` |
| `specializations` | `{code,name,academicUnitId}` |
| `groups` | `{code,name,specializationId}` |
| `lab-groups` | `{code,academicGroupId}` |
| `subjects` | `{code,name}` |

Parent moves and academic group code changes are refused while referenced. Deletes check all child references before invoking SQL; no cascading deletion of offerings/academic history is exposed.

## Private attachments

| Method | Path | Request / result |
| --- | --- | --- |
| GET | `/labs/:id/attachments` | Authorized list `{id,labId,filename,mimeType,size,uploadedAt}[]` |
| POST | `/labs/:id/attachments` | Teacher; `Content-Type: application/octet-stream`, URL-encoded `X-Filename`, raw bytes, normal CSRF header; 201 metadata |
| GET | `/attachments/:id/download` | Authorized forced download with private/no-store, nosniff and sandbox headers |
| DELETE | `/attachments/:id` | Teacher; open midterm; 204 and durable file cleanup queue |

Default limit is 10 MiB (`UPLOAD_MAX_BYTES`). PDF/PNG/JPEG signatures and TXT nonbinary content are checked; extension is allowlisted. Filenames cannot contain paths/control characters and never determine filesystem storage paths. Random 256-bit storage keys are private and not returned. Students need enrollment in the lab's offering; teachers need coverage; admins need offering scope. Upload failures remove newly written files. Committed metadata deletion queues physical cleanup; `npm run storage:maintain` retries failures and removes abandoned generated files older than one hour. Locked attachments remain downloadable but immutable.

## Verified behavior and limits

See [verification report](verification-report.md) for current executed commands, API/browser evidence, and external requirements. The [MySQL runtime-FK regression](database-integrity.md) is retained; the installed server now passes after a persistent native-FK configuration change and restart that preserved all schema/data. The normal API entry point refuses startup with unsafe FK settings. `npm run db:check` audits database references read-only. Production SMTP/HTTPS and load/failover have not been verified.
