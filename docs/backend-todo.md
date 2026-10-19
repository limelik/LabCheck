# Backend backlog

## Lab Attachments
Status: Deferred until core backend is stable.

Original planned implementation:
- Add a `lab_attachments` table referencing `lab_assignments`.
- Store original filename, storage key, MIME type, file size, and upload timestamp.
- Store file bytes in a configured local upload directory.
- Add:
  - `POST /api/labs/:id/attachments`
  - `GET /api/attachments/:id/download`
  - `DELETE /api/attachments/:id`
- Connect the existing teacher upload and student download UI.

No attachment schema or API changes are part of the core backend implementation. The existing attachment control is disabled until this feature is implemented.

## Additional deferred work

### MySQL schema compatibility — resolved

Status: Completed and verified on 2026-10-19. The approved one-line change sets `lab_change_requests_enrollment_fk` to `ON DELETE RESTRICT`. No other schema definitions or constraints were changed. The full schema and seed now import on MySQL 26.7.0, with all 19 tables, 1 view, 19 triggers, 30 foreign keys, named constraints, and indexes present.

Database-backed tests verify that an enrollment with request history cannot be deleted. Request rows must be removed explicitly before that enrollment, or a parent whose deletion cascades into it, can be deleted. The API does not expose these parent/enrollment deletion operations. Database verification is no longer blocked.

### Nested offering deletion cascade — unresolved verification failure

Status: Failed on the available MySQL 26.7.0 server on 2026-10-19. A minimal disposable offering has a locked first midterm with four labs and an open second midterm with one lab. Directly deleting the offering removes its midterms but leaves the second-midterm lab without a parent. `foreign_key_checks` is enabled, and `SHOW CREATE TABLE` confirms `ON DELETE CASCADE` on both `offering_midterms_offering_fk` and the composite `lab_assignments_midterm_fk`.

Reproduce with `RUN_DB_TESTS=1 node --test server/tests/database-integrity.integration.test.js`. The test intentionally retains the failing assertion and explicitly cleans its fixture rows afterward. Investigate the server's nested/composite cascade behavior before exposing parent deletion operations. No additional schema or constraint change is authorized or applied. The implemented API has no offering-delete endpoint; its direct lab-delete cascade and all other core endpoints passed. The local database was checked for leftover verification orphans after cleanup.

### Verification limits

Status: Core local API verification passed, with the separate integrity failure above still open. All 34 implemented method/path combinations passed 201 HTTP checks against MySQL, and the main student, teacher, and admin React flows were checked with refresh persistence. See [api.md](./api.md) for the test matrix and repeatable commands.

Still untested: live SMTP delivery, browser submission of signup/reset forms (their APIs and development mailbox were tested), production HTTPS/Secure-cookie deployment, and concurrent load. These are testing limits; no additional feature implementation was added. Attachments and the deferred items below remain outside the verified core.

### Institutional roster integration

Status: Deferred. Signup currently claims only an existing account/profile identity in the database. Importing a trusted institutional roster or issuing invitations needs a source that is not present in this repository.

### Locked-result corrections

Status: Deferred. The documented business rules make locked grades and attendance read-only. If corrections are required later, they need an audited workflow and explicit approval.

### Legacy admin prototype screens

Status: Deferred. The un-routed components for manual department, group, student, teacher, subject, and approval management still use local example data. The active navigation uses academic structure, offerings, and teacher coverage instead. No API or schema changes were added for the un-routed prototypes.
