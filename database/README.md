# LabCheck MySQL model

The active database definition is `schema.mysql.sql`; load `seed.mysql.sql` only for demo data. The other SQL dialects are historical and are not used for backend development.

## Confirmed rules

- Accounts use `@polytechnic.am` email addresses. Registration needs email verification before login; routine student and teacher registrations should not require manual approval. Email ownership alone does not prove a person's teacher role or academic group, so the backend must verify those claims against an institutional roster or invitation before granting access. The backend must hash passwords and verification tokens; the front end currently simulates login and signup.
- Each student belongs to one academic group. Automatic placement creates `ceil(student_count / 16)` lab groups for that academic group (zero for an empty group), sorts students by surname, and distributes them across those lab groups. One lab group holds at most 16 students per offering. The backend must serialize placement changes when multiple requests arrive together.
- Each offering is one subject, academic group, academic year, and Fall or Spring semester. Its enrolled students can have different lab group placements by subject. `default_lab_group_id` preserves the initial placement when a teacher approves a change.
- One teacher is assigned to each offering and lab group. A teacher may teach several lab groups or offerings.
- A student may have one pending lab change request per enrollment. Approval records the deciding teacher and time and changes the current placement; rejection preserves it. Approved and rejected requests remain as history.
- Each offering has two midterms. A teacher may build the lab set up to 16 whole-number points, but the lab maximum grades must total exactly 16 before the midterm can be locked. Every enrolled student must also have a whole-number grade and attendance mark for every lab and a whole-number exam score from 0 to 4. Each midterm has an overall maximum of 20. There may be at most 14 labs across the offering. The first midterm must be locked before labs can be added to or the second midterm locked. Locked labs, attendance, lab grades, and exam scores are read-only. Corrections will need a separate audited workflow if required later.
- Attendance is stored per student and lab. Three absences in a midterm always make the student not allowed; `student_midterm_progress` derives the absence count, lab points, exam points, overall points, and eligibility. Overall points remain unset until both the lab and exam scores are complete.

## Data flow

`user_accounts` -> `students` / `teachers` / `admins`; `academic_units` -> `specializations` -> `academic_groups` -> `lab_groups`; `subjects` + `academic_groups` -> `subject_group_offerings` -> `offering_midterms` -> `lab_assignments`; offerings also link to teachers and students through assignment and enrollment tables. `student_lab_results` stores attendance and lab grades; `student_midterm_results` stores exam scores; `lab_change_requests` stores placement decisions.

## Backend work still required

Registration should create an unverified account, email a one-time verification link, validate the person's role and academic group against trusted institutional data, then allow login after verification without routine manual approval. The existing approval fields may support exceptional review. Creating an offering should create its two midterm rows and enroll eligible students. Placement, midterm lock, and lab change approval must each run in a transaction. The React screens still use in-memory examples and must be connected to these operations through an API.
