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
  (24, 'mane.petrosyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:10:00'),
  (25, 'ani.sargsyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:15:00'),
  (26, 'erik.hovsepyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:20:00'),
  (27, 'lusine.grigoryan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:25:00'),
  (28, 'arsen.vardanyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:30:00'),
  (29, 'mariam.hakobyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:35:00'),
  (30, 'gor.petrosyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:40:00'),
  (31, 'nune.mkrtchyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:45:00'),
  (32, 'hrayr.avetisyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:50:00'),
  (33, 'eva.davtyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 11:55:00'),
  (34, 'arman.sargsyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:00:00'),
  (35, 'sona.khachatryan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:05:00'),
  (36, 'david.manukyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:10:00'),
  (37, 'lilit.harutyunyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:15:00'),
  (38, 'samvel.hovhannisyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:20:00'),
  (39, 'tatev.sahakyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:25:00'),
  (40, 'edgar.abrahamyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:30:00'),
  (41, 'elina.gevorgyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:35:00'),
  (42, 'ruben.melikyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:40:00'),
  (43, 'naira.petrosyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:45:00'),
  (44, 'vrej.arakelyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:50:00'),
  (45, 'gayane.karapetyan@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 12:55:00'),
  (46, 'demo.tt319.01@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (47, 'demo.tt319.02@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (48, 'demo.tt319.03@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (49, 'demo.tt319.04@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (50, 'demo.tt319.05@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (51, 'demo.tt319.06@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (52, 'demo.tt319.07@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (53, 'demo.tt319.08@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (54, 'demo.tt319.09@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (55, 'demo.tt319.10@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (56, 'demo.tt319.11@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (57, 'demo.tt319.12@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (58, 'demo.tt319.13@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (59, 'demo.tt319.14@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (60, 'demo.tt319.15@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (61, 'demo.tt319.16@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (62, 'demo.tt319.17@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (63, 'demo.tt319.18@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (64, 'demo.tt319.19@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (65, 'demo.tt319.20@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (66, 'demo.tt319.21@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (67, 'demo.tt320.01@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (68, 'demo.tt320.02@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (69, 'demo.tt320.03@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (70, 'demo.tt320.04@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (71, 'demo.tt320.05@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (72, 'demo.tt320.06@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (73, 'demo.tt320.07@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (74, 'demo.tt320.08@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (75, 'demo.tt320.09@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (76, 'demo.tt320.10@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (77, 'demo.tt320.11@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (78, 'demo.tt320.12@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (79, 'demo.tt320.13@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (80, 'demo.tt320.14@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (81, 'demo.tt419.01@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (82, 'demo.tt419.02@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (83, 'demo.tt419.03@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (84, 'demo.tt419.04@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (85, 'demo.tt419.05@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (86, 'demo.tt419.06@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (87, 'demo.tt419.07@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (88, 'demo.tt419.08@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (89, 'demo.tt419.09@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (90, 'demo.tt419.10@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (91, 'demo.tt419.11@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (92, 'demo.tt419.12@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (93, 'demo.tt419.13@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (94, 'demo.tt419.14@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (95, 'demo.tt330.01@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (96, 'demo.tt330.02@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (97, 'demo.tt330.03@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (98, 'demo.tt330.04@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (99, 'demo.tt330.05@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (100, 'demo.tt330.06@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (101, 'demo.tt330.07@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (102, 'demo.tt321.01@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (103, 'demo.tt321.02@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (104, 'demo.tt321.03@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (105, 'demo.tt321.04@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (106, 'demo.tt321.05@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (107, 'demo.tt321.06@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (108, 'demo.tt321.07@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (109, 'demo.tt321.08@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (110, 'demo.tt321.09@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (111, 'demo.tt321.10@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (112, 'demo.tt321.11@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (113, 'demo.tt321.12@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (114, 'demo.tt321.13@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (115, 'demo.tt321.14@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (116, 'demo.tt420.01@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (117, 'demo.tt420.02@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (118, 'demo.tt420.03@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (119, 'demo.tt420.04@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (120, 'demo.tt420.05@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (121, 'demo.tt420.06@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (122, 'demo.tt420.07@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (123, 'demo.tt420.08@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (124, 'demo.tt420.09@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (125, 'demo.tt420.10@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (126, 'demo.tt420.11@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (127, 'demo.tt420.12@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (128, 'demo.tt420.13@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00'),
  (129, 'demo.tt420.14@polytechnic.am', 'demo-hash', 'STUDENT', 'APPROVED', '2026-05-25 13:00:00');

UPDATE user_accounts
SET email_verified_at = '2026-05-25 08:00:00'
WHERE approval_status = 'APPROVED';

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
  (1, 1, 'TT319', 'Software Engineering'),
  (2, 2, 'TT320', 'Computer Science'),
  (3, 1, 'TT419', 'Software Engineering'),
  (4, 4, 'TT330', 'Applied Mathematics'),
  (5, 3, 'TT321', 'Information Systems'),
  (6, 2, 'TT420', 'Computer Science');

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

INSERT INTO students (id, user_account_id, academic_group_id, first_name, last_name)
VALUES
  (1, 10, 1, 'Milena', 'Simonyan'),
  (2, 11, 1, 'Liana', 'Melikyan'),
  (3, 12, 1, 'Armen', 'Petrosyan'),
  (4, 13, 1, 'Narek', 'Sargsyan'),
  (5, 14, 1, 'Elen', 'Manukyan'),
  (6, 15, 2, 'Gor', 'Grigoryan'),
  (7, 16, 2, 'Sara', 'Harutyunyan'),
  (8, 17, 2, 'Davit', 'Khachatryan'),
  (9, 18, 3, 'Anna', 'Vardanyan'),
  (10, 19, 3, 'Aram', 'Baghdasaryan'),
  (11, 20, 4, 'Mery', 'Stepanyan'),
  (12, 21, 5, 'Susanna', 'Aleksanyan'),
  (13, 22, 5, 'Hakob', 'Gasparyan'),
  (14, 23, 6, 'Vahan', 'Ghazaryan'),
  (15, 24, 6, 'Mane', 'Petrosyan'),
  (16, 25, 1, 'Ani', 'Sargsyan'),
  (17, 26, 1, 'Erik', 'Hovsepyan'),
  (18, 27, 1, 'Lusine', 'Grigoryan'),
  (19, 28, 1, 'Arsen', 'Vardanyan'),
  (20, 29, 2, 'Mariam', 'Hakobyan'),
  (21, 30, 2, 'Gor', 'Petrosyan'),
  (22, 31, 2, 'Nune', 'Mkrtchyan'),
  (23, 32, 3, 'Hrayr', 'Avetisyan'),
  (24, 33, 3, 'Eva', 'Davtyan'),
  (25, 34, 3, 'Arman', 'Sargsyan'),
  (26, 35, 3, 'Sona', 'Khachatryan'),
  (27, 36, 4, 'David', 'Manukyan'),
  (28, 37, 4, 'Lilit', 'Harutyunyan'),
  (29, 38, 5, 'Samvel', 'Hovhannisyan'),
  (30, 39, 5, 'Tatev', 'Sahakyan'),
  (31, 40, 5, 'Edgar', 'Abrahamyan'),
  (32, 41, 5, 'Elina', 'Gevorgyan'),
  (33, 42, 6, 'Ruben', 'Melikyan'),
  (34, 43, 6, 'Naira', 'Petrosyan'),
  (35, 44, 6, 'Vrej', 'Arakelyan'),
  (36, 45, 6, 'Gayane', 'Karapetyan');

INSERT INTO students (user_account_id, academic_group_id, first_name, last_name)
SELECT account.id, academic_group.id, demo.first_name, demo.last_name
FROM (
  SELECT 'demo.tt319.01@polytechnic.am' AS email, 'Alik' AS first_name, 'Avagyan' AS last_name
  UNION ALL SELECT 'demo.tt319.02@polytechnic.am', 'Sona', 'Voskanyan'
  UNION ALL SELECT 'demo.tt319.03@polytechnic.am', 'Vahe', 'Grigoryan'
  UNION ALL SELECT 'demo.tt319.04@polytechnic.am', 'Lusine', 'Ghazaryan'
  UNION ALL SELECT 'demo.tt319.05@polytechnic.am', 'Vardan', 'Simonyan'
  UNION ALL SELECT 'demo.tt319.06@polytechnic.am', 'Mari', 'Hakobyan'
  UNION ALL SELECT 'demo.tt319.07@polytechnic.am', 'Narek', 'Davtyan'
  UNION ALL SELECT 'demo.tt319.08@polytechnic.am', 'Arpine', 'Sargsyan'
  UNION ALL SELECT 'demo.tt319.09@polytechnic.am', 'Suren', 'Karapetyan'
  UNION ALL SELECT 'demo.tt319.10@polytechnic.am', 'Narine', 'Petrosyan'
  UNION ALL SELECT 'demo.tt319.11@polytechnic.am', 'Areg', 'Mkrtchyan'
  UNION ALL SELECT 'demo.tt319.12@polytechnic.am', 'Liana', 'Ghazaryan'
  UNION ALL SELECT 'demo.tt319.13@polytechnic.am', 'Arman', 'Hovhannisyan'
  UNION ALL SELECT 'demo.tt319.14@polytechnic.am', 'Seda', 'Manukyan'
  UNION ALL SELECT 'demo.tt319.15@polytechnic.am', 'Gagik', 'Harutyunyan'
  UNION ALL SELECT 'demo.tt319.16@polytechnic.am', 'Arevik', 'Abrahamyan'
  UNION ALL SELECT 'demo.tt319.17@polytechnic.am', 'Tigran', 'Avetisyan'
  UNION ALL SELECT 'demo.tt319.18@polytechnic.am', 'Nare', 'Melikyan'
  UNION ALL SELECT 'demo.tt319.19@polytechnic.am', 'Hakob', 'Arakelyan'
  UNION ALL SELECT 'demo.tt319.20@polytechnic.am', 'Gor', 'Vardanyan'
  UNION ALL SELECT 'demo.tt319.21@polytechnic.am', 'Tatev', 'Hovsepyan'
  UNION ALL SELECT 'demo.tt320.01@polytechnic.am', 'Armen', 'Hovhannisyan'
  UNION ALL SELECT 'demo.tt320.02@polytechnic.am', 'Elen', 'Gevorgyan'
  UNION ALL SELECT 'demo.tt320.03@polytechnic.am', 'Aram', 'Harutyunyan'
  UNION ALL SELECT 'demo.tt320.04@polytechnic.am', 'Anahit', 'Vardanyan'
  UNION ALL SELECT 'demo.tt320.05@polytechnic.am', 'Samvel', 'Sargsyan'
  UNION ALL SELECT 'demo.tt320.06@polytechnic.am', 'Milena', 'Gasparyan'
  UNION ALL SELECT 'demo.tt320.07@polytechnic.am', 'Davit', 'Asatryan'
  UNION ALL SELECT 'demo.tt320.08@polytechnic.am', 'Mariam', 'Kirakosyan'
  UNION ALL SELECT 'demo.tt320.09@polytechnic.am', 'Erik', 'Khachatryan'
  UNION ALL SELECT 'demo.tt320.10@polytechnic.am', 'Hasmik', 'Manukyan'
  UNION ALL SELECT 'demo.tt320.11@polytechnic.am', 'Ruben', 'Baghdasaryan'
  UNION ALL SELECT 'demo.tt320.12@polytechnic.am', 'Nune', 'Galstyan'
  UNION ALL SELECT 'demo.tt320.13@polytechnic.am', 'Vahagn', 'Melikyan'
  UNION ALL SELECT 'demo.tt320.14@polytechnic.am', 'Eva', 'Sahakyan'
  UNION ALL SELECT 'demo.tt419.01@polytechnic.am', 'Artur', 'Ghazaryan'
  UNION ALL SELECT 'demo.tt419.02@polytechnic.am', 'Arev', 'Tadevosyan'
  UNION ALL SELECT 'demo.tt419.03@polytechnic.am', 'Edgar', 'Petrosyan'
  UNION ALL SELECT 'demo.tt419.04@polytechnic.am', 'Ani', 'Hovhannisyan'
  UNION ALL SELECT 'demo.tt419.05@polytechnic.am', 'Vahe', 'Sargsyan'
  UNION ALL SELECT 'demo.tt419.06@polytechnic.am', 'Silva', 'Avetisyan'
  UNION ALL SELECT 'demo.tt419.07@polytechnic.am', 'Levon', 'Hakobyan'
  UNION ALL SELECT 'demo.tt419.08@polytechnic.am', 'Arpi', 'Grigoryan'
  UNION ALL SELECT 'demo.tt419.09@polytechnic.am', 'Gevorg', 'Martirosyan'
  UNION ALL SELECT 'demo.tt419.10@polytechnic.am', 'Mariam', 'Vardanyan'
  UNION ALL SELECT 'demo.tt419.11@polytechnic.am', 'Ashot', 'Manukyan'
  UNION ALL SELECT 'demo.tt419.12@polytechnic.am', 'Sofi', 'Mkrtchyan'
  UNION ALL SELECT 'demo.tt419.13@polytechnic.am', 'Karen', 'Poghosyan'
  UNION ALL SELECT 'demo.tt419.14@polytechnic.am', 'Lilit', 'Sargsyan'
  UNION ALL SELECT 'demo.tt330.01@polytechnic.am', 'Tigran', 'Petrosyan'
  UNION ALL SELECT 'demo.tt330.02@polytechnic.am', 'Ani', 'Mkrtchyan'
  UNION ALL SELECT 'demo.tt330.03@polytechnic.am', 'Arman', 'Avetisyan'
  UNION ALL SELECT 'demo.tt330.04@polytechnic.am', 'Hasmik', 'Sargsyan'
  UNION ALL SELECT 'demo.tt330.05@polytechnic.am', 'Vahan', 'Harutyunyan'
  UNION ALL SELECT 'demo.tt330.06@polytechnic.am', 'Nare', 'Ghazaryan'
  UNION ALL SELECT 'demo.tt330.07@polytechnic.am', 'Samvel', 'Karapetyan'
  UNION ALL SELECT 'demo.tt321.01@polytechnic.am', 'Vardan', 'Hakobyan'
  UNION ALL SELECT 'demo.tt321.02@polytechnic.am', 'Ani', 'Petrosyan'
  UNION ALL SELECT 'demo.tt321.03@polytechnic.am', 'Davit', 'Vardanyan'
  UNION ALL SELECT 'demo.tt321.04@polytechnic.am', 'Nare', 'Sargsyan'
  UNION ALL SELECT 'demo.tt321.05@polytechnic.am', 'Gor', 'Hovsepyan'
  UNION ALL SELECT 'demo.tt321.06@polytechnic.am', 'Lilit', 'Avetisyan'
  UNION ALL SELECT 'demo.tt321.07@polytechnic.am', 'Aram', 'Manukyan'
  UNION ALL SELECT 'demo.tt321.08@polytechnic.am', 'Hasmik', 'Melikyan'
  UNION ALL SELECT 'demo.tt321.09@polytechnic.am', 'Ruben', 'Sargsyan'
  UNION ALL SELECT 'demo.tt321.10@polytechnic.am', 'Mariam', 'Hakobyan'
  UNION ALL SELECT 'demo.tt321.11@polytechnic.am', 'Tigran', 'Khachatryan'
  UNION ALL SELECT 'demo.tt321.12@polytechnic.am', 'Nune', 'Petrosyan'
  UNION ALL SELECT 'demo.tt321.13@polytechnic.am', 'Erik', 'Arakelyan'
  UNION ALL SELECT 'demo.tt321.14@polytechnic.am', 'Seda', 'Vardanyan'
  UNION ALL SELECT 'demo.tt420.01@polytechnic.am', 'Gagik', 'Sargsyan'
  UNION ALL SELECT 'demo.tt420.02@polytechnic.am', 'Nare', 'Harutyunyan'
  UNION ALL SELECT 'demo.tt420.03@polytechnic.am', 'Ruben', 'Avetisyan'
  UNION ALL SELECT 'demo.tt420.04@polytechnic.am', 'Liana', 'Vardanyan'
  UNION ALL SELECT 'demo.tt420.05@polytechnic.am', 'Suren', 'Hakobyan'
  UNION ALL SELECT 'demo.tt420.06@polytechnic.am', 'Arpi', 'Manukyan'
  UNION ALL SELECT 'demo.tt420.07@polytechnic.am', 'Davit', 'Ghazaryan'
  UNION ALL SELECT 'demo.tt420.08@polytechnic.am', 'Mariam', 'Avetisyan'
  UNION ALL SELECT 'demo.tt420.09@polytechnic.am', 'Hovik', 'Petrosyan'
  UNION ALL SELECT 'demo.tt420.10@polytechnic.am', 'Arevik', 'Vardanyan'
  UNION ALL SELECT 'demo.tt420.11@polytechnic.am', 'Edgar', 'Grigoryan'
  UNION ALL SELECT 'demo.tt420.12@polytechnic.am', 'Seda', 'Sargsyan'
  UNION ALL SELECT 'demo.tt420.13@polytechnic.am', 'Vahan', 'Hovsepyan'
  UNION ALL SELECT 'demo.tt420.14@polytechnic.am', 'Hasmik', 'Mkrtchyan'
) AS demo
JOIN user_accounts account
  ON account.email = demo.email AND account.account_type = 'STUDENT'
JOIN academic_groups academic_group
  ON academic_group.code = UPPER(SUBSTRING(
    SUBSTRING_INDEX(SUBSTRING_INDEX(account.email, '@', 1), '.', 2),
    6
  ))
LEFT JOIN students existing ON existing.user_account_id = account.id
WHERE existing.id IS NULL;

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

INSERT INTO offering_midterms (subject_group_offering_id, midterm_no, status)
VALUES
  (1, 1, 'OPEN'),
  (1, 2, 'OPEN'),
  (2, 1, 'OPEN'),
  (2, 2, 'OPEN'),
  (3, 1, 'OPEN'),
  (3, 2, 'OPEN'),
  (4, 1, 'OPEN'),
  (4, 2, 'OPEN'),
  (5, 1, 'OPEN'),
  (5, 2, 'OPEN'),
  (6, 1, 'OPEN'),
  (6, 2, 'OPEN'),
  (7, 1, 'OPEN'),
  (7, 2, 'OPEN'),
  (8, 1, 'OPEN'),
  (8, 2, 'OPEN'),
  (9, 1, 'OPEN'),
  (9, 2, 'OPEN'),
  (10, 1, 'OPEN'),
  (10, 2, 'OPEN'),
  (11, 1, 'OPEN'),
  (11, 2, 'OPEN'),
  (12, 1, 'OPEN'),
  (12, 2, 'OPEN');

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

INSERT INTO student_subject_enrollments (id, student_id, subject_group_offering_id, lab_group_id, default_lab_group_id)
VALUES
  (1, 1, 1, 1, 1),
  (2, 2, 1, 1, 1),
  (3, 3, 1, 2, 2),
  (4, 4, 1, 3, 3),
  (5, 5, 1, 2, 2),
  (6, 1, 2, 1, 1),
  (7, 2, 2, 2, 2),
  (8, 3, 2, 2, 2),
  (9, 4, 2, 3, 3),
  (10, 5, 2, 1, 1),
  (11, 1, 3, 1, 1),
  (12, 2, 3, 1, 1),
  (13, 3, 3, 2, 2),
  (14, 4, 3, 3, 3),
  (15, 5, 3, 2, 2),
  (16, 6, 4, 4, 4),
  (17, 7, 4, 5, 5),
  (18, 8, 4, 4, 4),
  (19, 6, 7, 4, 4),
  (20, 7, 7, 4, 4),
  (21, 8, 7, 5, 5),
  (22, 9, 6, 6, 6),
  (23, 10, 6, 7, 7),
  (24, 9, 8, 7, 7),
  (25, 10, 8, 6, 6),
  (26, 11, 5, 8, 8),
  (27, 11, 9, 8, 8),
  (28, 12, 10, 9, 9),
  (29, 13, 10, 10, 10),
  (30, 14, 11, 11, 11),
  (31, 15, 11, 12, 12),
  (32, 14, 12, 12, 12),
  (33, 15, 12, 11, 11),
  (34, 16, 1, 1, 1),
  (35, 17, 1, 2, 2),
  (36, 18, 1, 3, 3),
  (37, 19, 1, 3, 3),
  (38, 16, 2, 1, 1),
  (39, 17, 2, 2, 2),
  (40, 18, 2, 3, 3),
  (41, 19, 2, 3, 3),
  (42, 16, 3, 1, 1),
  (43, 17, 3, 2, 2),
  (44, 18, 3, 3, 3),
  (45, 19, 3, 3, 3),
  (46, 20, 4, 4, 4),
  (47, 21, 4, 5, 5),
  (48, 22, 4, 5, 5),
  (49, 20, 7, 4, 4),
  (50, 21, 7, 5, 5),
  (51, 22, 7, 5, 5),
  (52, 23, 6, 6, 6),
  (53, 24, 6, 6, 6),
  (54, 25, 6, 7, 7),
  (55, 26, 6, 7, 7),
  (56, 23, 8, 7, 7),
  (57, 24, 8, 7, 7),
  (58, 25, 8, 6, 6),
  (59, 26, 8, 6, 6),
  (60, 27, 5, 8, 8),
  (61, 28, 5, 8, 8),
  (62, 27, 9, 8, 8),
  (63, 28, 9, 8, 8),
  (64, 29, 10, 9, 9),
  (65, 30, 10, 9, 9),
  (66, 31, 10, 10, 10),
  (67, 32, 10, 10, 10),
  (68, 33, 11, 11, 11),
  (69, 34, 11, 11, 11),
  (70, 35, 11, 12, 12),
  (71, 36, 11, 12, 12),
  (72, 33, 12, 12, 12),
  (73, 34, 12, 12, 12),
  (74, 35, 12, 11, 11),
  (75, 36, 12, 11, 11);

INSERT INTO student_subject_enrollments (
  student_id,
  subject_group_offering_id,
  lab_group_id,
  default_lab_group_id
)
SELECT student.id, offering.id, lab_group.id, lab_group.id
FROM students student
JOIN user_accounts account ON account.id = student.user_account_id
JOIN academic_groups academic_group ON academic_group.id = student.academic_group_id
JOIN subject_group_offerings offering
  ON offering.academic_group_id = academic_group.id AND offering.is_active = TRUE
JOIN lab_groups lab_group
  ON lab_group.academic_group_id = academic_group.id
  AND lab_group.code = CONCAT(
    SUBSTRING(academic_group.code, 3),
    '-',
    CEIL(CAST(SUBSTRING_INDEX(
      SUBSTRING_INDEX(account.email, '@', 1),
      '.',
      -1
    ) AS UNSIGNED) / 7)
  )
LEFT JOIN student_subject_enrollments existing
  ON existing.student_id = student.id
  AND existing.subject_group_offering_id = offering.id
WHERE account.email LIKE 'demo.tt%.__@polytechnic.am'
  AND existing.id IS NULL;

INSERT INTO lab_assignments (id, subject_group_offering_id, midterm_no, lab_number, title, max_grade)
VALUES
  (1, 1, 1, 1, 'Lab 1', 4),
  (2, 1, 1, 2, 'Lab 2', 4),
  (3, 1, 1, 3, 'Lab 3', 4),
  (4, 1, 1, 4, 'Lab 4', 4),
  (5, 2, 1, 1, 'Lab 1', 5),
  (6, 2, 1, 2, 'Lab 2', 5),
  (7, 2, 1, 3, 'Lab 3', 5),
  (8, 3, 1, 1, 'Lab 1', 5),
  (9, 3, 1, 2, 'Lab 2', 5),
  (10, 4, 1, 1, 'Lab 1', 5),
  (11, 4, 1, 2, 'Lab 2', 5),
  (12, 5, 1, 1, 'Lab 1', 4),
  (13, 5, 1, 2, 'Lab 2', 4),
  (14, 5, 1, 3, 'Lab 3', 4),
  (15, 5, 1, 4, 'Lab 4', 4),
  (16, 6, 1, 1, 'Lab 1', 4),
  (17, 6, 1, 2, 'Lab 2', 4),
  (18, 6, 1, 3, 'Lab 3', 4),
  (19, 6, 1, 4, 'Lab 4', 4),
  (20, 7, 1, 1, 'Lab 1', 4),
  (21, 7, 1, 2, 'Lab 2', 4),
  (22, 7, 1, 3, 'Lab 3', 4),
  (23, 7, 1, 4, 'Lab 4', 4),
  (24, 8, 1, 1, 'Lab 1', 5),
  (25, 8, 1, 2, 'Lab 2', 5),
  (26, 8, 1, 3, 'Lab 3', 5),
  (27, 9, 1, 1, 'Lab 1', 5),
  (28, 9, 1, 2, 'Lab 2', 5),
  (29, 10, 1, 1, 'Lab 1', 4),
  (30, 10, 1, 2, 'Lab 2', 4),
  (31, 10, 1, 3, 'Lab 3', 4),
  (32, 10, 1, 4, 'Lab 4', 4),
  (33, 11, 1, 1, 'Lab 1', 4),
  (34, 11, 1, 2, 'Lab 2', 4),
  (35, 11, 1, 3, 'Lab 3', 4),
  (36, 11, 1, 4, 'Lab 4', 4),
  (37, 12, 1, 1, 'Lab 1', 5),
  (38, 12, 1, 2, 'Lab 2', 5),
  (39, 12, 1, 3, 'Lab 3', 5),
  (40, 2, 1, 4, 'Lab 4', 1),
  (41, 3, 1, 3, 'Lab 3', 5),
  (42, 3, 1, 4, 'Lab 4', 1),
  (43, 4, 1, 3, 'Lab 3', 5),
  (44, 4, 1, 4, 'Lab 4', 1),
  (45, 8, 1, 4, 'Lab 4', 1),
  (46, 9, 1, 3, 'Lab 3', 5),
  (47, 9, 1, 4, 'Lab 4', 1),
  (48, 12, 1, 4, 'Lab 4', 1);

INSERT INTO student_lab_results (
  id,
  lab_assignment_id,
  student_subject_enrollment_id,
  attendance,
  grade
)
VALUES
  (1, 1, 1, 'PRESENT', 4),
  (2, 2, 1, 'PRESENT', 3),
  (3, 3, 1, 'PRESENT', 4),
  (4, 4, 1, 'PRESENT', 4),
  (5, 1, 2, 'PRESENT', 3),
  (6, 2, 2, 'ABSENT', NULL),
  (7, 3, 2, 'PRESENT', 4),
  (8, 4, 2, 'PRESENT', 3),
  (9, 1, 3, 'PRESENT', 3),
  (10, 2, 3, 'PRESENT', 4),
  (11, 3, 3, 'PRESENT', 3),
  (12, 4, 3, 'UNMARKED', NULL),
  (13, 1, 4, 'ABSENT', NULL),
  (14, 2, 4, 'PRESENT', 2),
  (15, 3, 4, 'PRESENT', 3),
  (16, 4, 4, 'PRESENT', 3),
  (17, 1, 5, 'PRESENT', 2),
  (18, 2, 5, 'PRESENT', 3),
  (19, 3, 5, 'PRESENT', 3),
  (20, 5, 6, 'PRESENT', 5),
  (21, 6, 6, 'PRESENT', 4),
  (22, 7, 6, 'PRESENT', 5),
  (23, 5, 7, 'PRESENT', 4),
  (24, 6, 7, 'EXCUSED', NULL),
  (25, 7, 7, 'PRESENT', 4),
  (26, 5, 8, 'PRESENT', 5),
  (27, 6, 8, 'PRESENT', 4),
  (28, 5, 9, 'PRESENT', 3),
  (29, 6, 9, 'PRESENT', 4),
  (30, 5, 10, 'UNMARKED', NULL),
  (31, 8, 11, 'PRESENT', 5),
  (32, 9, 11, 'PRESENT', 5),
  (33, 8, 12, 'PRESENT', 5),
  (34, 8, 13, 'PRESENT', 5),
  (35, 9, 13, 'PRESENT', 5),
  (36, 8, 14, 'ABSENT', NULL),
  (37, 8, 15, 'PRESENT', 5),
  (38, 9, 15, 'PRESENT', 5),
  (39, 10, 16, 'PRESENT', 5),
  (40, 11, 16, 'PRESENT', 5),
  (41, 10, 17, 'PRESENT', 5),
  (42, 10, 18, 'UNMARKED', NULL),
  (43, 11, 18, 'PRESENT', 5),
  (44, 12, 26, 'PRESENT', 4),
  (45, 13, 26, 'PRESENT', 4),
  (46, 14, 26, 'PRESENT', 4),
  (47, 15, 26, 'PRESENT', 3),
  (48, 16, 22, 'PRESENT', 4),
  (49, 17, 22, 'PRESENT', 4),
  (50, 18, 22, 'PRESENT', 3),
  (51, 16, 23, 'PRESENT', 3),
  (52, 17, 23, 'PRESENT', 4),
  (53, 20, 19, 'PRESENT', 4),
  (54, 21, 19, 'PRESENT', 4),
  (55, 20, 20, 'PRESENT', 3),
  (56, 20, 21, 'PRESENT', 3),
  (57, 21, 21, 'PRESENT', 4),
  (58, 24, 24, 'PRESENT', 5),
  (59, 25, 24, 'PRESENT', 4),
  (60, 24, 25, 'PRESENT', 5),
  (61, 27, 27, 'PRESENT', 5),
  (62, 29, 28, 'PRESENT', 4),
  (63, 30, 28, 'PRESENT', 4),
  (64, 29, 29, 'PRESENT', 3),
  (65, 33, 30, 'PRESENT', 4),
  (66, 34, 30, 'PRESENT', 4),
  (67, 35, 30, 'PRESENT', 4),
  (68, 33, 31, 'PRESENT', 3),
  (69, 34, 31, 'PRESENT', 4),
  (70, 37, 32, 'PRESENT', 5),
  (71, 38, 32, 'PRESENT', 4),
  (72, 37, 33, 'PRESENT', 5);

INSERT INTO student_midterm_results
  (student_subject_enrollment_id, midterm_no, exam_score)
VALUES
  (1, 1, 4),
  (2, 1, 3),
  (3, 1, 2),
  (4, 1, 3),
  (5, 1, 4),
  (6, 1, 3),
  (11, 1, 4);

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
