# LabCheck MySQL model

The database definition is `schema.mysql.sql`; load `seed.mysql.sql` only for demo data.

## Confirmed rules

- Accounts use `@polytechnic.am` email addresses. Registration needs email verification before login; routine student and teacher registrations should not require manual approval. Verified university email activates the selected student or teacher role automatically; existing account roles cannot be changed through signup. Teaching assignments are managed separately. The backend must hash passwords and verification tokens; the React interface uses six-digit SMTP OTP verification and MySQL-backed sessions.
- Each student belongs to one academic group. Automatic placement creates `ceil(student_count / 16)` lab groups for that academic group (zero for an empty group), sorts students by surname, and distributes them across those lab groups. One lab group holds at most 16 students per offering. The backend must serialize placement changes when multiple requests arrive together.
- Each offering is one subject, academic group, academic year, and Fall or Spring semester. Its enrolled students can have different lab group placements by subject. `default_lab_group_id` preserves the initial placement when a teacher approves a change.
- One teacher is assigned to each offering and lab group. A teacher may teach several lab groups or offerings.
- A student may have one pending lab change request per enrollment. Approval records the deciding teacher and time and changes the current placement; rejection preserves it. Approved and rejected requests remain as history.
- Each offering has two midterms. Each lab has a difficulty from 1 to 5, which is also that lab's maximum grade. The sum of lab difficulties must be exactly 16 for each midterm before it can be locked. The lab number is assigned automatically; the teacher supplies only its title. Every enrolled student must also have a whole-number grade and attendance mark for every lab and a whole-number exam score from 0 to 4. Each midterm has an overall maximum of 20. There may be at most 14 labs across the offering. The first midterm must be locked before labs can be added to or the second midterm locked. Locked labs, attendance, lab grades, and exam scores are read-only. Corrections will need a separate audited workflow if required later.
- Attendance is stored per student and lab. Three absences in a midterm always make the student not allowed; `student_midterm_progress` derives the absence count, lab points, exam points, overall points, and eligibility. Overall points remain unset until both the lab and exam scores are complete.

## Data flow

`user_accounts` -> `students` / `teachers` / `admins`; `academic_units` -> `specializations` -> `academic_groups` -> `lab_groups`; `subjects` + `academic_groups` -> `subject_group_offerings` -> `offering_midterms` -> `lab_assignments`; offerings also link to teachers and students through assignment and enrollment tables. `student_lab_results` stores attendance and lab grades; `student_midterm_results` stores exam scores; `lab_change_requests` stores placement decisions.

## Current implementation

The Express backend and active React workflows are database-backed. New feature tables are introduced only by `database/migrations/001_identity_sessions_attachments.sql`; apply with `npm run db:migrate`. The migration preserves all original constraints and triggers. See [API](../docs/api.md), [architecture](../docs/backend-plan.md), and [verification](../docs/verification-report.md).

New student signup detects the academic group from the verified institutional email. Student and teacher signup creates missing profiles automatically after OTP verification, without administrator approval. Students need a recognized email group. Existing account roles and disabled/rejected status remain protected. Admin provisioning is separate and public admin signup is disabled.

The MySQL 26.7.0 runtime foreign-key implementation fails the nested converging cascade regression. The existing local server has now been repaired by persisting native FK handling and restarting; all table data/schema hashes and triggers remained unchanged. The complete suite passes on that server, including the original regression and eight additional converging-path scenarios. `npm run db:check` audits the 36 application FKs and request-history RESTRICT action. No offering-delete API is exposed. See [investigation and applied repair](../docs/database-integrity.md) before choosing a production database configuration.
