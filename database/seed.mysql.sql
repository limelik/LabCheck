USE labcheck;

INSERT INTO user_accounts (
  id,
  email,
  password_hash,
  account_type,
  approval_status,
  last_login_at
)
VALUES
  (1, 'root.admin@polytechnic.am', 'demo-hash', 'ADMIN', 'APPROVED', '2026-05-25 09:00:00'),
  (2, 'se.admin@polytechnic.am', 'demo-hash', 'ADMIN', 'APPROVED', '2026-05-25 09:10:00'),
  (3, 'it.admin@polytechnic.am', 'demo-hash', 'ADMIN', 'APPROVED', '2026-05-25 09:15:00'),
  (4, 'ani.hakobyan@polytechnic.am', 'demo-hash', 'TEACHER', 'APPROVED', '2026-05-25 08:30:00'),
  (5, 'marine.avetisyan@polytechnic.am', 'demo-hash', 'TEACHER', 'APPROVED', '2026-05-25 08:35:00'),
  (6, 'karen.mkrtchyan@polytechnic.am', 'demo-hash', 'TEACHER', 'APPROVED', '2026-05-25 08:40:00'),
  (7, 'levon.sahakyan@polytechnic.am', 'demo-hash', 'TEACHER', 'APPROVED', '2026-05-25 08:45:00'),
  (8, 'narine.margaryan@polytechnic.am', 'demo-hash', 'TEACHER', 'APPROVED', '2026-05-25 08:50:00'),
  (9, 'as.admin@polytechnic.am', 'demo-hash', 'ADMIN', 'APPROVED', '2026-05-25 09:20:00'),
  (10, 'milena.simonyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:00:00'),
  (11, 'liana.melikyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:05:00'),
  (12, 'armen.petrosyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:10:00'),
  (13, 'narek.sargsyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:15:00'),
  (14, 'elen.manukyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:20:00'),
  (15, 'gor.grigoryan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:25:00'),
  (16, 'sara.harutyunyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:30:00'),
  (17, 'davit.khachatryan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:35:00'),
  (18, 'anna.vardanyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:40:00'),
  (19, 'aram.baghdasaryan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:45:00'),
  (20, 'mery.stepanyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:50:00'),
  (21, 'susanna.aleksanyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 10:55:00'),
  (22, 'hakob.gasparyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:00:00'),
  (23, 'vahan.ghazaryan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:05:00'),
  (24, 'mane.petrosyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:10:00');

INSERT INTO academic_units (id, code, name, unit_type)
VALUES
  (1, 'INST-SE', 'Software Systems Institute', 'INSTITUTE'),
  (2, 'INST-EE', 'Energy Engineering Institute', 'INSTITUTE'),
  (3, 'INST-ME', 'Mechanical Engineering Institute', 'INSTITUTE'),
  (4, 'INST-AC', 'Architecture and Construction Institute', 'INSTITUTE'),
  (5, 'FAC-IT', 'Information Technologies Faculty', 'FACULTY'),
  (6, 'FAC-AS', 'Applied Sciences Faculty', 'FACULTY');

INSERT INTO specializations (id, academic_unit_id, code, name)
VALUES
  (1, 1, '19', 'Software Engineering'),
  (2, 1, '20', 'Computer Science'),
  (3, 5, '21', 'Information Systems'),
  (4, 6, '30', 'Applied Mathematics');

INSERT INTO academic_groups (id, specialization_id, code, name)
VALUES
  (1, 1, 319, 'Software Engineering'),
  (2, 2, 320, 'Computer Science'),
  (3, 1, 419, 'Software Engineering'),
  (4, 4, 330, 'Applied Mathematics'),
  (5, 3, 321, 'Information Systems'),
  (6, 2, 420, 'Computer Science');

INSERT INTO lab_groups (id, academic_group_id, code)
VALUES
  (1, 1, '319-1'),
  (2, 1, '319-2'),
  (3, 1, '319-3'),
  (4, 2, '320-1'),
  (5, 2, '320-2'),
  (6, 3, '419-1'),
  (7, 3, '419-2'),
  (8, 4, '330-1'),
  (9, 5, '321-1'),
  (10, 5, '321-2'),
  (11, 6, '420-1'),
  (12, 6, '420-2');

INSERT INTO subjects (id, code, name)
VALUES
  (1, 'DB101', 'Databases'),
  (2, 'WEB201', 'Web Development'),
  (3, 'PHY101', 'Physics'),
  (4, 'DM105', 'Discrete Mathematics'),
  (5, 'ALG220', 'Algorithms'),
  (6, 'OOP230', 'Object-Oriented Programming'),
  (7, 'CAL110', 'Calculus'),
  (8, 'NET240', 'Computer Networks');

INSERT INTO admins (id, user_account_id, academic_unit_id, first_name, last_name, admin_level)
VALUES
  (1, 1, NULL, 'Root', 'Admin', 'SUPER_ADMIN'),
  (2, 2, 1, 'Mariam', 'Hakobyan', 'ACADEMIC_UNIT_ADMIN'),
  (3, 3, 5, 'Tigran', 'Grigoryan', 'ACADEMIC_UNIT_ADMIN'),
  (4, 9, 6, 'Sona', 'Abrahamyan', 'ACADEMIC_UNIT_ADMIN');

INSERT INTO teachers (id, user_account_id, first_name, last_name)
VALUES
  (1, 4, 'Ani', 'Hakobyan'),
  (2, 5, 'Marine', 'Avetisyan'),
  (3, 6, 'Karen', 'Mkrtchyan'),
  (4, 7, 'Levon', 'Sahakyan'),
  (5, 8, 'Narine', 'Margaryan');

INSERT INTO students (id, user_account_id, first_name, last_name)
VALUES
  (1, 10, 'Milena', 'Simonyan'),
  (2, 11, 'Liana', 'Melikyan'),
  (3, 12, 'Armen', 'Petrosyan'),
  (4, 13, 'Narek', 'Sargsyan'),
  (5, 14, 'Elen', 'Manukyan'),
  (6, 15, 'Gor', 'Grigoryan'),
  (7, 16, 'Sara', 'Harutyunyan'),
  (8, 17, 'Davit', 'Khachatryan'),
  (9, 18, 'Anna', 'Vardanyan'),
  (10, 19, 'Aram', 'Baghdasaryan'),
  (11, 20, 'Mery', 'Stepanyan'),
  (12, 21, 'Susanna', 'Aleksanyan'),
  (13, 22, 'Hakob', 'Gasparyan'),
  (14, 23, 'Vahan', 'Ghazaryan'),
  (15, 24, 'Mane', 'Petrosyan');

INSERT INTO subject_group_offerings (
  id,
  subject_id,
  academic_group_id,
  academic_year,
  semester,
  is_active,
  total_grade
)
VALUES
  (1, 1, 1, '2025-2026', 'Fall', TRUE, 16.00),
  (2, 2, 1, '2025-2026', 'Fall', TRUE, 16.00),
  (3, 3, 1, '2025-2026', 'Spring', TRUE, 16.00),
  (4, 3, 2, '2025-2026', 'Spring', TRUE, 16.00),
  (5, 4, 4, '2025-2026', 'Fall', TRUE, 16.00),
  (6, 1, 3, '2025-2026', 'Fall', TRUE, 16.00),
  (7, 5, 2, '2025-2026', 'Fall', TRUE, 16.00),
  (8, 6, 3, '2025-2026', 'Spring', TRUE, 16.00),
  (9, 7, 4, '2025-2026', 'Spring', TRUE, 16.00),
  (10, 8, 5, '2025-2026', 'Fall', TRUE, 16.00),
  (11, 2, 6, '2025-2026', 'Spring', TRUE, 16.00),
  (12, 5, 6, '2025-2026', 'Fall', TRUE, 16.00);

INSERT INTO teacher_subject_assignments (id, teacher_id, subject_group_offering_id, lab_group_id)
VALUES
  (1, 1, 1, 1),
  (2, 1, 1, 2),
  (3, 2, 1, 3),
  (4, 2, 2, 1),
  (5, 2, 2, 2),
  (6, 3, 2, 3),
  (7, 3, 3, 1),
  (8, 4, 3, 2),
  (9, 4, 3, 3),
  (10, 4, 4, 4),
  (11, 5, 4, 5),
  (12, 1, 5, 8),
  (13, 1, 6, 6),
  (14, 5, 6, 7),
  (15, 4, 7, 4),
  (16, 5, 7, 5),
  (17, 2, 8, 6),
  (18, 5, 8, 7),
  (19, 4, 9, 8),
  (20, 3, 10, 9),
  (21, 5, 10, 10),
  (22, 2, 11, 11),
  (23, 4, 11, 12),
  (24, 5, 12, 11),
  (25, 4, 12, 12);

INSERT INTO student_subject_enrollments (id, student_id, subject_group_offering_id, lab_group_id)
VALUES
  (1, 1, 1, 1),
  (2, 2, 1, 1),
  (3, 3, 1, 2),
  (4, 4, 1, 3),
  (5, 5, 1, 2),
  (6, 1, 2, 1),
  (7, 2, 2, 2),
  (8, 3, 2, 2),
  (9, 4, 2, 3),
  (10, 5, 2, 1),
  (11, 1, 3, 1),
  (12, 2, 3, 1),
  (13, 3, 3, 2),
  (14, 4, 3, 3),
  (15, 5, 3, 2),
  (16, 6, 4, 4),
  (17, 7, 4, 5),
  (18, 8, 4, 4),
  (19, 6, 7, 4),
  (20, 7, 7, 4),
  (21, 8, 7, 5),
  (22, 9, 6, 6),
  (23, 10, 6, 7),
  (24, 9, 8, 7),
  (25, 10, 8, 6),
  (26, 11, 5, 8),
  (27, 11, 9, 8),
  (28, 12, 10, 9),
  (29, 13, 10, 10),
  (30, 14, 11, 11),
  (31, 15, 11, 12),
  (32, 14, 12, 12),
  (33, 15, 12, 11);

INSERT INTO lab_assignments (id, subject_group_offering_id, lab_number, max_grade)
VALUES
  (1, 1, 1, 4.00),
  (2, 1, 2, 4.00),
  (3, 1, 3, 4.00),
  (4, 1, 4, 4.00),
  (5, 2, 1, 6.00),
  (6, 2, 2, 5.00),
  (7, 2, 3, 5.00),
  (8, 3, 1, 8.00),
  (9, 3, 2, 8.00),
  (10, 4, 1, 8.00),
  (11, 4, 2, 8.00),
  (12, 5, 1, 4.00),
  (13, 5, 2, 4.00),
  (14, 5, 3, 4.00),
  (15, 5, 4, 4.00),
  (16, 6, 1, 4.00),
  (17, 6, 2, 4.00),
  (18, 6, 3, 4.00),
  (19, 6, 4, 4.00),
  (20, 7, 1, 4.00),
  (21, 7, 2, 4.00),
  (22, 7, 3, 4.00),
  (23, 7, 4, 4.00),
  (24, 8, 1, 5.00),
  (25, 8, 2, 5.00),
  (26, 8, 3, 6.00),
  (27, 9, 1, 8.00),
  (28, 9, 2, 8.00),
  (29, 10, 1, 4.00),
  (30, 10, 2, 4.00),
  (31, 10, 3, 4.00),
  (32, 10, 4, 4.00),
  (33, 11, 1, 4.00),
  (34, 11, 2, 4.00),
  (35, 11, 3, 4.00),
  (36, 11, 4, 4.00),
  (37, 12, 1, 6.00),
  (38, 12, 2, 5.00),
  (39, 12, 3, 5.00);

INSERT INTO student_lab_results (
  id,
  lab_assignment_id,
  student_subject_enrollment_id,
  attendance,
  grade
)
VALUES
  (1, 1, 1, 'PRESENT', 3.50),
  (2, 2, 1, 'PRESENT', 3.00),
  (3, 3, 1, 'PRESENT', 4.00),
  (4, 4, 1, 'PRESENT', 3.50),
  (5, 1, 2, 'PRESENT', 3.00),
  (6, 2, 2, 'ABSENT', NULL),
  (7, 3, 2, 'PRESENT', 3.50),
  (8, 4, 2, 'PRESENT', 3.00),
  (9, 1, 3, 'PRESENT', 2.50),
  (10, 2, 3, 'PRESENT', 3.50),
  (11, 3, 3, 'PRESENT', 3.00),
  (12, 4, 3, 'UNMARKED', NULL),
  (13, 1, 4, 'ABSENT', NULL),
  (14, 2, 4, 'PRESENT', 2.00),
  (15, 3, 4, 'PRESENT', 2.50),
  (16, 4, 4, 'PRESENT', 3.00),
  (17, 1, 5, 'PRESENT', 2.00),
  (18, 2, 5, 'PRESENT', 2.50),
  (19, 3, 5, 'PRESENT', 3.00),
  (20, 5, 6, 'PRESENT', 5.00),
  (21, 6, 6, 'PRESENT', 4.00),
  (22, 7, 6, 'PRESENT', 4.50),
  (23, 5, 7, 'PRESENT', 4.00),
  (24, 6, 7, 'EXCUSED', NULL),
  (25, 7, 7, 'PRESENT', 3.50),
  (26, 5, 8, 'PRESENT', 4.50),
  (27, 6, 8, 'PRESENT', 4.00),
  (28, 5, 9, 'PRESENT', 3.00),
  (29, 6, 9, 'PRESENT', 3.50),
  (30, 5, 10, 'UNMARKED', NULL),
  (31, 8, 11, 'PRESENT', 7.50),
  (32, 9, 11, 'PRESENT', 6.50),
  (33, 8, 12, 'PRESENT', 6.00),
  (34, 8, 13, 'PRESENT', 6.50),
  (35, 9, 13, 'PRESENT', 6.00),
  (36, 8, 14, 'ABSENT', NULL),
  (37, 8, 15, 'PRESENT', 5.50),
  (38, 9, 15, 'PRESENT', 6.00),
  (39, 10, 16, 'PRESENT', 7.00),
  (40, 11, 16, 'PRESENT', 7.50),
  (41, 10, 17, 'PRESENT', 6.00),
  (42, 10, 18, 'UNMARKED', NULL),
  (43, 11, 18, 'PRESENT', 6.50),
  (44, 12, 26, 'PRESENT', 4.00),
  (45, 13, 26, 'PRESENT', 3.50),
  (46, 14, 26, 'PRESENT', 4.00),
  (47, 15, 26, 'PRESENT', 3.00),
  (48, 16, 22, 'PRESENT', 3.50),
  (49, 17, 22, 'PRESENT', 4.00),
  (50, 18, 22, 'PRESENT', 3.00),
  (51, 16, 23, 'PRESENT', 3.00),
  (52, 17, 23, 'PRESENT', 3.50),
  (53, 20, 19, 'PRESENT', 3.50),
  (54, 21, 19, 'PRESENT', 4.00),
  (55, 20, 20, 'PRESENT', 3.00),
  (56, 20, 21, 'PRESENT', 2.50),
  (57, 21, 21, 'PRESENT', 3.50),
  (58, 24, 24, 'PRESENT', 4.50),
  (59, 25, 24, 'PRESENT', 4.00),
  (60, 24, 25, 'PRESENT', 5.00),
  (61, 27, 27, 'PRESENT', 7.00),
  (62, 29, 28, 'PRESENT', 3.50),
  (63, 30, 28, 'PRESENT', 4.00),
  (64, 29, 29, 'PRESENT', 3.00),
  (65, 33, 30, 'PRESENT', 4.00),
  (66, 34, 30, 'PRESENT', 3.50),
  (67, 35, 30, 'PRESENT', 4.00),
  (68, 33, 31, 'PRESENT', 3.00),
  (69, 34, 31, 'PRESENT', 3.50),
  (70, 37, 32, 'PRESENT', 5.00),
  (71, 38, 32, 'PRESENT', 4.00),
  (72, 37, 33, 'PRESENT', 4.50);

INSERT INTO password_reset_tokens (
  id,
  user_account_id,
  token_hash,
  expires_at
)
VALUES
  (1, 10, 'demo-reset-token-hash-1', '2026-05-25 18:00:00'),
  (2, 4, 'demo-reset-token-hash-2', '2026-05-26 09:00:00'),
  (3, 18, 'demo-reset-token-hash-3', '2026-05-25 20:30:00'),
  (4, 23, 'demo-reset-token-hash-4', '2026-05-26 11:15:00');
