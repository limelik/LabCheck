# LabCheck Database

This schema models a university lab management workflow for students, teachers, academic-unit admins, and super admins.

Files:

- PostgreSQL: [`schema.sql`](./schema.sql), [`seed.sql`](./seed.sql)
- MySQL 8.0: [`schema.mysql.sql`](./schema.mysql.sql), [`seed.mysql.sql`](./seed.mysql.sql)
- ER diagram: [`er-diagram.mysql.md`](./er-diagram.mysql.md)

## Design goals

- keep login and approval logic centralized in `user_accounts`
- keep subjects as a shared catalog instead of making one institute/faculty own Physics, Math, and other common subjects
- model the academic structure as academic units -> specializations -> academic groups -> lab groups
- enforce one academic-unit admin per academic unit
- treat a subject offering as one subject taught to one academic group in one semester
- assume every lab subgroup of that academic group is part of the offering
- allow individual labs to be shared only to the lab groups that should see them
- model the real grading rule: two midterms per offering, each with up to 16 lab points plus a 4-point exam
- preserve cross-table safety with triggers where a plain foreign key is not enough

## Why the model looks like this

- `user_accounts` is the authentication root for every role and stores approval workflow metadata.
- `academic_units` represents the top-level structures admins manage: institutes and faculties.
- `specializations` stores the stable specialization under an academic unit, such as Software Engineering.
- `academic_groups` stores the actual cohort code, such as `319` or `419`, so multiple years can point to the same specialization.
- `lab_groups` stores the subgroup split inside an academic group, such as `319-1`.
- `subjects` is now a shared catalog only. It no longer belongs to an academic unit, because subjects like Physics may be taught across many units.
- `admins` now directly stores `academic_unit_id`. This enforces the rule that one academic-unit admin manages one unit, and each unit has at most one such admin.
- `subject_group_offerings` represents one subject taught to one academic group in one semester and academic year.
- `teacher_subject_assignments` and `student_subject_enrollments` both tie a person to an offering and a concrete lab group.
- `lab_assignments` now belongs to an offering and a midterm block. Each lab has its own `max_points`, and a trigger ensures the labs for one offering midterm never exceed 16 total points.
- `lab_assignment_lab_groups` is the per-lab visibility table. It says which subgroups can see a specific lab.
- `student_lab_results` stores one student's result for one lab.
- `student_midterm_results` stores the separate 4-point midterm exam score for each offering midterm.

## Table map

- `user_accounts`
  - one login identity
- `academic_units`
  - one institute or faculty
- `specializations`
  - one specialization within an academic unit
- `academic_groups`
  - one cohort group like `319`
- `lab_groups`
  - one subgroup like `319-1`
- `subjects`
  - one reusable subject definition like Physics or Databases
- `admins`
  - one admin profile, optionally scoped to exactly one academic unit
- `teachers`
  - one teacher profile
- `students`
  - one student profile
- `subject_group_offerings`
  - one subject taught to one academic group in one semester and academic year
- `teacher_subject_assignments`
  - one teacher assigned to one offering for one lab group
- `student_subject_enrollments`
  - one student enrolled in one offering and one lab group
- `lab_assignments`
  - one lab inside one offering and one midterm block
- `lab_assignment_lab_groups`
  - one visibility link saying that one lab is visible to one lab group
- `student_lab_results`
  - one student's attendance and grade for one lab
- `student_midterm_results`
  - one student's exam score for one midterm block
- `password_reset_tokens`
  - one reset token lifecycle
- `activity_logs`
  - one audit event

## Integrity rules worth calling out

- A `user_accounts.email` must end with `@polytechnic.am`.
- An `ACADEMIC_UNIT_ADMIN` must have exactly one `academic_unit_id`, while a `SUPER_ADMIN` must not have one.
- A teacher assignment and a student enrollment can only point to lab groups that belong to the same academic group as the offering.
- The total `lab_assignments.max_points` for one offering midterm cannot exceed `16`.
- `lab_assignment_lab_groups` can only point to lab groups from the same academic group as the offering behind that lab.
- A `student_lab_results` row is valid only when:
  - the student's enrollment belongs to the same offering as the lab
  - the lab is visible to the student's lab group
  - the grade does not exceed that lab's `max_points`
- A `student_midterm_results.exam_score` must stay in the `0..4` range.

## Derived views

- `student_subject_progress`
  - produces absence count, first-midterm lab score, first-midterm exam score, second-midterm lab score, second-midterm exam score, and overall total for each student enrollment
- `not_allowed_students`
  - filters the progress view to students blocked by absences

## Visibility rule for student labs

A student can see a lab only when all of the following are true:

1. The student is enrolled in the same `subject_group_offering_id` as the lab.
2. The student's `lab_group_id` is linked to that lab in `lab_assignment_lab_groups`.
3. The lab is published.

## Recommended backend boundary

- authentication against `user_accounts`
- approval workflows backed by `user_accounts.reviewed_*`
- admin authorization using `admins`
- CRUD for academic units, specializations, academic groups, lab groups, subjects, offerings, labs, and assignments
- attendance and lab grading updates on `student_lab_results`
- midterm exam grading updates on `student_midterm_results`
- audit writes into `activity_logs`
