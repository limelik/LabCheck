# LabCheck MySQL model

The database definition is `schema.mysql.sql`; load `seed.mysql.sql` only for demo data.

## Confirmed rules

- Accounts use `@polytechnic.am` email addresses. The authentication API hashes passwords, verification codes, and password-reset codes and requires verified email before login. Student and teacher accounts require administrator approval because email ownership alone does not prove a person's role. Student group choices are checked against the database but are not matched against an authoritative roster.
- Each student belongs to one academic group. Automatic placement creates `ceil(student_count / 16)` lab groups for that academic group (zero for an empty group), sorts students by surname, and distributes them across those lab groups. One lab group holds at most 16 students per offering. Offering placement and approved lab-group changes run transactionally.
- Each offering is one subject, academic group, academic year, and Fall or Spring semester. Its enrolled students can have different lab group placements by subject. `default_lab_group_id` preserves the initial placement when a teacher approves a change.
- One teacher is assigned to each offering and lab group. A teacher may teach several lab groups or offerings.
- A student may have one pending lab change request per enrollment. Approval records the deciding teacher and time and changes the current placement; rejection preserves it. Approved and rejected requests remain as history.
- Enrollment rows with lab-change request history cannot be deleted; preserve the decision history rather than cascading it away.
- Each offering has two midterms. Each lab has a difficulty from 1 to 5, which is also that lab's maximum grade. The sum of lab difficulties must be exactly 16 for each midterm before it can be locked. The lab number is assigned automatically; the teacher supplies only its title. Every enrolled student must also have a whole-number grade and attendance mark for every lab and a whole-number exam score from 0 to 4. Each midterm has an overall maximum of 20. There may be at most 14 labs across the offering. The first midterm must be locked before labs can be added to or the second midterm locked. Locked labs, attendance, lab grades, and exam scores are read-only. Corrections will need a separate audited workflow if required later.
- Attendance is stored per student and lab. Three absences in a midterm always make the student not allowed; `student_midterm_progress` derives the absence count, lab points, exam points, overall points, and eligibility. Overall points remain unset until both the lab and exam scores are complete.

## Data flow

`user_accounts` -> `students` / `teachers` / `admins`; `academic_units` -> `specializations` -> `academic_groups` -> `lab_groups`; `subjects` + `academic_groups` -> `subject_group_offerings` -> `offering_midterms` -> `lab_assignments`; offerings also link to teachers and students through assignment and enrollment tables. `student_lab_results` stores attendance and lab grades; `student_midterm_results` stores exam scores; `lab_change_requests` stores placement decisions; `lab_attachments` stores metadata for private files under `server/storage/uploads`. `email_verification_tokens` and `password_reset_tokens` store one-time code hashes and expiry times.

## API and application status

The Node/Express API supports registration, email verification and resend, password reset, login/logout, admin approvals and offerings, teacher coverage, student placement requests, teacher decisions, lab attachments, grading, exam results, and midterm locking. The React dashboards load their operational data through authenticated, role-filtered bootstrap responses. Configure MySQL and SMTP in `.env`; see the root README.

Academic units, specializations, academic groups, lab groups, and the initial demo dataset are managed through SQL/schema setup; an academic-structure editor is not currently exposed in the application. Student group selection is validated against existing groups but is not yet matched against an authoritative institutional roster. Corrections to locked grades require a separate audited workflow.
