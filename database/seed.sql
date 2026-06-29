BEGIN;

INSERT INTO user_accounts (
  id,
  email,
  password_hash,
  account_type,
  approval_status,
  is_active,
  last_login_at,
  reviewed_by_user_account_id,
  reviewed_at,
  approval_note
)
VALUES
  (
    1,
    'root.admin@polytechnic.am',
    'demo-hash',
    'ADMIN',
    'APPROVED',
    TRUE,
    TIMESTAMPTZ '2026-05-07 09:10:00+04',
    NULL,
    NULL,
    'Bootstrap super admin account.'
  );

INSERT INTO user_accounts (
  id,
  email,
  password_hash,
  account_type,
  approval_status,
  is_active,
  last_login_at,
  reviewed_by_user_account_id,
  reviewed_at,
  approval_note
)
VALUES
  (2, 'cs.admin@polytechnic.am', 'demo-hash', 'ADMIN', 'APPROVED', TRUE, TIMESTAMPTZ '2026-05-07 10:05:00+04', 1, TIMESTAMPTZ '2025-09-01 09:00:00+04', 'Academic-unit admin approved by super admin.'),
  (3, 'ani.hakobyan@polytechnic.am', 'demo-hash', 'TEACHER', 'APPROVED', TRUE, TIMESTAMPTZ '2026-05-08 08:25:00+04', 1, TIMESTAMPTZ '2025-09-02 11:00:00+04', 'Teacher account verified.'),
  (4, 'garegin.stepanyan@polytechnic.am', 'demo-hash', 'TEACHER', 'APPROVED', TRUE, TIMESTAMPTZ '2026-05-08 08:10:00+04', 1, TIMESTAMPTZ '2025-09-02 11:15:00+04', 'Teacher account verified.'),
  (10, 'milena.simonyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', TRUE, TIMESTAMPTZ '2026-05-08 09:05:00+04', 1, TIMESTAMPTZ '2025-09-05 13:00:00+04', 'Student account approved after enrollment check.'),
  (11, 'liana.melikyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', TRUE, TIMESTAMPTZ '2026-05-07 15:40:00+04', 1, TIMESTAMPTZ '2025-09-05 13:10:00+04', 'Student account approved after enrollment check.'),
  (12, 'armen.petrosyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', TRUE, TIMESTAMPTZ '2026-05-06 17:25:00+04', 1, TIMESTAMPTZ '2025-09-05 13:20:00+04', 'Student account approved after enrollment check.'),
  (13, 'pending.teacher@polytechnic.am', 'demo-hash', 'TEACHER', 'PENDING', TRUE, NULL, NULL, NULL, 'Awaiting academic-unit approval.');

INSERT INTO academic_units (id, code, name, unit_type)
VALUES
  (1, 'INST-SE', 'Software Systems Institute', 'INSTITUTE'),
  (2, 'INST-EE', 'Energy Engineering Institute', 'INSTITUTE'),
  (3, 'INST-ME', 'Mechanical Engineering Institute', 'INSTITUTE'),
  (4, 'INST-AC', 'Architecture and Construction Institute', 'INSTITUTE'),
  (5, 'FAC-IT', 'Information Technologies Faculty', 'FACULTY'),
  (6, 'FAC-AS', 'Applied Sciences Faculty', 'FACULTY');

INSERT INTO admins (id, user_account_id, academic_unit_id, first_name, last_name, admin_level, employee_number)
VALUES
  (1, 1, NULL, 'Root', 'Admin', 'SUPER_ADMIN', 'A-0001'),
  (2, 2, 1, 'Mariam', 'Hakobyan', 'ACADEMIC_UNIT_ADMIN', 'A-0002');

INSERT INTO teachers (id, user_account_id, first_name, last_name, employee_number)
VALUES
  (1, 3, 'Ani', 'Hakobyan', 'T-1001'),
  (2, 4, 'Garegin', 'Stepanyan', 'T-1002');

INSERT INTO students (id, user_account_id, academic_group_id, first_name, last_name, student_number)
VALUES
  (1, 10, 1, 'Milena', 'Simonyan', 'SE319001'),
  (2, 11, 1, 'Liana', 'Melikyan', 'SE319002'),
  (3, 12, 1, 'Armen', 'Petrosyan', 'SE319003');

INSERT INTO specializations (id, academic_unit_id, code, name)
VALUES
  (1, 1, '19', 'Software Engineering'),
  (2, 1, '20', 'Computer Science'),
  (3, 5, '21', 'Information Systems'),
  (4, 6, '30', 'Applied Mathematics');

INSERT INTO academic_groups (id, specialization_id, code, name, start_year)
VALUES
  (1, 1, '319', '319 Software Engineering', 2023),
  (2, 2, '320', '320 Computer Science', 2023),
  (3, 1, '419', '419 Software Engineering', 2024);

INSERT INTO lab_groups (id, academic_group_id, code, lab_group_number)
VALUES
  (1, 1, '319-1', 1),
  (2, 1, '319-2', 2),
  (3, 1, '319-3', 3),
  (4, 2, '320-1', 1),
  (5, 2, '320-2', 2),
  (6, 3, '419-1', 1);

INSERT INTO subjects (id, code, name)
VALUES
  (1, 'DB101', 'Databases'),
  (2, 'WEB201', 'Web Development'),
  (3, 'PHY101', 'Physics');

INSERT INTO subject_group_offerings (id, subject_id, academic_group_id, academic_year, semester, max_absences_before_block)
VALUES
  (1, 1, 1, '2025-2026', 'Fall', 3),
  (2, 2, 1, '2025-2026', 'Fall', 3),
  (3, 3, 1, '2025-2026', 'Fall', 2),
  (4, 3, 2, '2025-2026', 'Fall', 2);

INSERT INTO teacher_subject_assignments (id, teacher_id, subject_group_offering_id, lab_group_id)
VALUES
  (1, 1, 1, 1),
  (2, 1, 1, 2),
  (3, 2, 2, 1),
  (4, 2, 3, 2),
  (5, 1, 4, 4);

INSERT INTO lab_assignments (id, subject_group_offering_id, midterm_no, lab_number, title, description, max_points, difficulty)
VALUES
  (1, 1, 1, 1, 'Lab 1: SQL Basics', 'Introductory SELECT and filtering tasks.', 8, 2),
  (2, 1, 1, 2, 'Lab 2: Joins', 'INNER, LEFT, and aggregate join exercises.', 8, 3),
  (3, 1, 2, 1, 'Lab 3: Transactions', 'ACID concepts and isolation labs.', 16, 4),
  (4, 2, 1, 1, 'Lab 1: HTML Layout', 'Semantic structure and responsive layout.', 16, 2);

INSERT INTO lab_assignment_lab_groups (lab_assignment_id, lab_group_id)
VALUES
  (1, 1),
  (1, 2),
  (1, 3),
  (2, 1),
  (2, 2),
  (2, 3),
  (3, 2),
  (4, 1);

INSERT INTO student_lab_results (
  lab_assignment_id,
  student_subject_enrollment_id,
  attendance,
  grade,
  teacher_comment,
  graded_at
)
VALUES
  (1, 1, 'PRESENT', 6, 'Solid SQL basics.', TIMESTAMPTZ '2026-04-02 09:15:00+04'),
  (2, 1, 'PRESENT', 7, 'Improved joins after revision.', TIMESTAMPTZ '2026-04-09 09:15:00+04'),
  (1, 2, 'PRESENT', 5, 'Needs cleaner query structure.', TIMESTAMPTZ '2026-04-02 09:20:00+04'),
  (2, 2, 'ABSENT', 0, 'Missed second lab session.', TIMESTAMPTZ '2026-04-09 09:20:00+04'),
  (3, 2, 'ABSENT', 0, 'Blocked by absences.', TIMESTAMPTZ '2026-04-16 09:20:00+04'),
  (1, 3, 'PRESENT', 7, 'Strong first submission.', TIMESTAMPTZ '2026-04-02 12:10:00+04'),
  (2, 3, 'ABSENT', 0, 'Missed the second lab session.', TIMESTAMPTZ '2026-04-09 12:10:00+04'),
  (4, 4, 'PRESENT', 12, 'Good semantic markup.', TIMESTAMPTZ '2026-04-04 10:00:00+04');

INSERT INTO student_midterm_results (
  student_subject_enrollment_id,
  midterm_no,
  exam_score,
  teacher_comment,
  graded_at
)
VALUES
  (1, 1, 4, 'Excellent midterm exam.', TIMESTAMPTZ '2026-04-15 11:00:00+04'),
  (2, 1, 2, 'Needs more theory review.', TIMESTAMPTZ '2026-04-15 11:10:00+04'),
  (3, 1, 3, 'Good midterm exam.', TIMESTAMPTZ '2026-04-15 11:20:00+04'),
  (4, 1, 3.5, 'Solid HTML fundamentals.', TIMESTAMPTZ '2026-04-17 10:00:00+04');

SELECT create_lab_change_request(1, 2);
SELECT approve_lab_change_request(1, 1);
SELECT create_lab_change_request(6, 1);
SELECT create_lab_change_request(2, 1);
SELECT reject_lab_change_request(3, 1);

INSERT INTO password_reset_tokens (
  id,
  user_account_id,
  token_hash,
  expires_at,
  used_at,
  created_at
)
VALUES
  (
    1,
    10,
    'demo-reset-token-hash-1',
    TIMESTAMPTZ '2026-04-20 11:00:00+04',
    TIMESTAMPTZ '2026-04-20 10:15:00+04',
    TIMESTAMPTZ '2026-04-20 10:00:00+04'
  ),
  (
    2,
    13,
    'demo-reset-token-hash-2',
    TIMESTAMPTZ '2026-05-08 19:30:00+04',
    NULL,
    TIMESTAMPTZ '2026-05-08 18:30:00+04'
  );

INSERT INTO activity_logs (
  id,
  actor_user_account_id,
  action_type,
  entity_type,
  entity_id,
  status,
  details,
  created_at
)
VALUES
  (
    1,
    1,
    'ACCOUNT_APPROVED',
    'user_account',
    '3',
    'SUCCESS',
    '{"approved_account_id": 3, "role": "TEACHER"}'::jsonb,
    TIMESTAMPTZ '2025-09-02 11:00:00+04'
  ),
  (
    2,
    1,
    'ACCOUNT_APPROVED',
    'user_account',
    '10',
    'SUCCESS',
    '{"approved_account_id": 10, "role": "STUDENT"}'::jsonb,
    TIMESTAMPTZ '2025-09-05 13:00:00+04'
  ),
  (
    3,
    3,
    'LAB_RESULT_UPDATED',
    'student_lab_result',
    '1',
    'SUCCESS',
    '{"subject_code": "DB101", "midterm_no": 1, "lab_number": 1, "student_enrollment_id": 1}'::jsonb,
    TIMESTAMPTZ '2026-04-02 09:15:00+04'
  ),
  (
    4,
    10,
    'PASSWORD_RESET_REQUESTED',
    'user_account',
    '10',
    'SUCCESS',
    '{"token_id": 1}'::jsonb,
    TIMESTAMPTZ '2026-04-20 10:00:00+04'
  );

SELECT setval('user_accounts_id_seq', (SELECT MAX(id) FROM user_accounts));
SELECT setval('academic_units_id_seq', (SELECT MAX(id) FROM academic_units));
SELECT setval('specializations_id_seq', (SELECT MAX(id) FROM specializations));
SELECT setval('academic_groups_id_seq', (SELECT MAX(id) FROM academic_groups));
SELECT setval('lab_groups_id_seq', (SELECT MAX(id) FROM lab_groups));
SELECT setval('subjects_id_seq', (SELECT MAX(id) FROM subjects));
SELECT setval('admins_id_seq', (SELECT MAX(id) FROM admins));
SELECT setval('teachers_id_seq', (SELECT MAX(id) FROM teachers));
SELECT setval('students_id_seq', (SELECT MAX(id) FROM students));
SELECT setval('subject_group_offerings_id_seq', (SELECT MAX(id) FROM subject_group_offerings));
SELECT setval('teacher_subject_assignments_id_seq', (SELECT MAX(id) FROM teacher_subject_assignments));
SELECT setval('student_subject_enrollments_id_seq', (SELECT MAX(id) FROM student_subject_enrollments));
SELECT setval('lab_change_requests_id_seq', (SELECT MAX(id) FROM lab_change_requests));
SELECT setval('lab_assignments_id_seq', (SELECT MAX(id) FROM lab_assignments));
SELECT setval('student_lab_results_id_seq', (SELECT MAX(id) FROM student_lab_results));
SELECT setval('student_midterm_results_id_seq', (SELECT MAX(id) FROM student_midterm_results));
SELECT setval('password_reset_tokens_id_seq', (SELECT MAX(id) FROM password_reset_tokens));
SELECT setval('activity_logs_id_seq', (SELECT MAX(id) FROM activity_logs));

COMMIT;
