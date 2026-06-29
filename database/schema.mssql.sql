IF DB_ID(N'labcheck') IS NULL
BEGIN
  CREATE DATABASE labcheck;
END;
GO

USE labcheck;
GO

CREATE TABLE dbo.user_accounts (
  id INT NOT NULL IDENTITY(1, 1),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  approval_status VARCHAR(20) NOT NULL CONSTRAINT user_accounts_approval_status_df DEFAULT 'PENDING',
  last_login_at DATETIME2 NULL,
  CONSTRAINT user_accounts_pk PRIMARY KEY (id),
  CONSTRAINT user_accounts_email_ux UNIQUE (email),
  CONSTRAINT user_accounts_email_domain_chk CHECK (LOWER(email) LIKE '%@polytechnic.am'),
  CONSTRAINT user_accounts_account_type_chk CHECK (account_type IN ('ADMIN', 'TEACHER', 'STUDENT')),
  CONSTRAINT user_accounts_approval_status_chk CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'))
);
GO

CREATE INDEX user_accounts_approval_status_idx
ON dbo.user_accounts (approval_status);
GO

CREATE TABLE dbo.academic_units (
  id INT NOT NULL IDENTITY(1, 1),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit_type VARCHAR(20) NOT NULL,
  CONSTRAINT academic_units_pk PRIMARY KEY (id),
  CONSTRAINT academic_units_code_ux UNIQUE (code),
  CONSTRAINT academic_units_name_ux UNIQUE (name),
  CONSTRAINT academic_units_unit_type_chk CHECK (unit_type IN ('INSTITUTE', 'FACULTY'))
);
GO

CREATE TABLE dbo.specializations (
  id INT NOT NULL IDENTITY(1, 1),
  academic_unit_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  CONSTRAINT specializations_pk PRIMARY KEY (id),
  CONSTRAINT specializations_code_ux UNIQUE (code),
  CONSTRAINT specializations_name_ux UNIQUE (name),
  CONSTRAINT specializations_academic_unit_fk
    FOREIGN KEY (academic_unit_id) REFERENCES dbo.academic_units(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE dbo.academic_groups (
  id INT NOT NULL IDENTITY(1, 1),
  specialization_id INT NOT NULL,
  code INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  CONSTRAINT academic_groups_pk PRIMARY KEY (id),
  CONSTRAINT academic_groups_code_ux UNIQUE (code),
  CONSTRAINT academic_groups_specialization_fk
    FOREIGN KEY (specialization_id) REFERENCES dbo.specializations(id)
    ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.lab_groups (
  id INT NOT NULL IDENTITY(1, 1),
  academic_group_id INT NOT NULL,
  code VARCHAR(50) NOT NULL,
  CONSTRAINT lab_groups_pk PRIMARY KEY (id),
  CONSTRAINT lab_groups_code_ux UNIQUE (code),
  CONSTRAINT lab_groups_group_fk
    FOREIGN KEY (academic_group_id) REFERENCES dbo.academic_groups(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE dbo.subjects (
  id INT NOT NULL IDENTITY(1, 1),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  CONSTRAINT subjects_pk PRIMARY KEY (id),
  CONSTRAINT subjects_code_ux UNIQUE (code)
);
GO

CREATE TABLE dbo.admins (
  id INT NOT NULL IDENTITY(1, 1),
  user_account_id INT NOT NULL,
  academic_unit_id INT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  admin_level VARCHAR(30) NOT NULL,
  CONSTRAINT admins_pk PRIMARY KEY (id),
  CONSTRAINT admins_user_account_ux UNIQUE (user_account_id),
  CONSTRAINT admins_scope_chk CHECK (
    (admin_level = 'SUPER_ADMIN' AND academic_unit_id IS NULL) OR
    (admin_level = 'ACADEMIC_UNIT_ADMIN' AND academic_unit_id IS NOT NULL)
  ),
  CONSTRAINT admins_level_chk CHECK (admin_level IN ('SUPER_ADMIN', 'ACADEMIC_UNIT_ADMIN')),
  CONSTRAINT admins_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES dbo.user_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT admins_academic_unit_fk
    FOREIGN KEY (academic_unit_id) REFERENCES dbo.academic_units(id)
    ON DELETE NO ACTION
);
GO

CREATE UNIQUE INDEX admins_academic_unit_ux
ON dbo.admins (academic_unit_id)
WHERE academic_unit_id IS NOT NULL;
GO

CREATE TABLE dbo.teachers (
  id INT NOT NULL IDENTITY(1, 1),
  user_account_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  CONSTRAINT teachers_pk PRIMARY KEY (id),
  CONSTRAINT teachers_user_account_ux UNIQUE (user_account_id),
  CONSTRAINT teachers_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES dbo.user_accounts(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE dbo.students (
  id INT NOT NULL IDENTITY(1, 1),
  user_account_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  CONSTRAINT students_pk PRIMARY KEY (id),
  CONSTRAINT students_user_account_ux UNIQUE (user_account_id),
  CONSTRAINT students_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES dbo.user_accounts(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE dbo.subject_group_offerings (
  id INT NOT NULL IDENTITY(1, 1),
  subject_id INT NOT NULL,
  academic_group_id INT NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  semester VARCHAR(10) NOT NULL,
  is_active BIT NOT NULL CONSTRAINT subject_group_offerings_is_active_df DEFAULT 1,
  total_grade DECIMAL(4, 2) NOT NULL CONSTRAINT subject_group_offerings_total_grade_df DEFAULT 16.00,
  CONSTRAINT subject_group_offerings_pk PRIMARY KEY (id),
  CONSTRAINT subject_group_offerings_ux UNIQUE (subject_id, academic_group_id, academic_year, semester),
  CONSTRAINT subject_group_offerings_total_grade_chk CHECK (total_grade > 0),
  CONSTRAINT subject_group_offerings_semester_chk CHECK (semester IN ('Fall', 'Spring')),
  CONSTRAINT subject_group_offerings_subject_fk
    FOREIGN KEY (subject_id) REFERENCES dbo.subjects(id)
    ON DELETE CASCADE,
  CONSTRAINT subject_group_offerings_group_fk
    FOREIGN KEY (academic_group_id) REFERENCES dbo.academic_groups(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE dbo.teacher_subject_assignments (
  id INT NOT NULL IDENTITY(1, 1),
  teacher_id INT NOT NULL,
  subject_group_offering_id INT NOT NULL,
  lab_group_id INT NOT NULL,
  CONSTRAINT teacher_subject_assignments_pk PRIMARY KEY (id),
  CONSTRAINT teacher_subject_assignments_ux UNIQUE (teacher_id, subject_group_offering_id, lab_group_id),
  CONSTRAINT teacher_subject_assignments_teacher_fk
    FOREIGN KEY (teacher_id) REFERENCES dbo.teachers(id)
    ON DELETE CASCADE,
  CONSTRAINT teacher_subject_assignments_offering_fk
    FOREIGN KEY (subject_group_offering_id) REFERENCES dbo.subject_group_offerings(id)
    ON DELETE CASCADE,
  CONSTRAINT teacher_subject_assignments_lab_group_fk
    FOREIGN KEY (lab_group_id) REFERENCES dbo.lab_groups(id)
    ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.student_subject_enrollments (
  id INT NOT NULL IDENTITY(1, 1),
  student_id INT NOT NULL,
  subject_group_offering_id INT NOT NULL,
  lab_group_id INT NOT NULL,
  CONSTRAINT student_subject_enrollments_pk PRIMARY KEY (id),
  CONSTRAINT student_subject_enrollments_ux UNIQUE (student_id, subject_group_offering_id),
  CONSTRAINT student_subject_enrollments_student_fk
    FOREIGN KEY (student_id) REFERENCES dbo.students(id)
    ON DELETE CASCADE,
  CONSTRAINT student_subject_enrollments_offering_fk
    FOREIGN KEY (subject_group_offering_id) REFERENCES dbo.subject_group_offerings(id)
    ON DELETE CASCADE,
  CONSTRAINT student_subject_enrollments_lab_group_fk
    FOREIGN KEY (lab_group_id) REFERENCES dbo.lab_groups(id)
    ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.lab_assignments (
  id INT NOT NULL IDENTITY(1, 1),
  subject_group_offering_id INT NOT NULL,
  lab_number INT NOT NULL,
  max_grade DECIMAL(4, 2) NOT NULL,
  CONSTRAINT lab_assignments_pk PRIMARY KEY (id),
  CONSTRAINT lab_assignments_offering_number_ux UNIQUE (subject_group_offering_id, lab_number),
  CONSTRAINT lab_assignments_max_grade_chk CHECK (max_grade > 0),
  CONSTRAINT lab_assignments_offering_fk
    FOREIGN KEY (subject_group_offering_id) REFERENCES dbo.subject_group_offerings(id)
    ON DELETE CASCADE
);
GO

CREATE TABLE dbo.student_lab_results (
  id INT NOT NULL IDENTITY(1, 1),
  lab_assignment_id INT NOT NULL,
  student_subject_enrollment_id INT NOT NULL,
  attendance VARCHAR(20) NOT NULL CONSTRAINT student_lab_results_attendance_df DEFAULT 'UNMARKED',
  grade DECIMAL(4, 2) NULL,
  CONSTRAINT student_lab_results_pk PRIMARY KEY (id),
  CONSTRAINT student_lab_results_ux UNIQUE (lab_assignment_id, student_subject_enrollment_id),
  CONSTRAINT student_lab_results_grade_chk CHECK (grade IS NULL OR (grade >= 0 AND grade <= 16)),
  CONSTRAINT student_lab_results_attendance_chk CHECK (attendance IN ('PRESENT', 'ABSENT', 'EXCUSED', 'UNMARKED')),
  CONSTRAINT student_lab_results_lab_fk
    FOREIGN KEY (lab_assignment_id) REFERENCES dbo.lab_assignments(id)
    ON DELETE CASCADE,
  CONSTRAINT student_lab_results_enrollment_fk
    FOREIGN KEY (student_subject_enrollment_id) REFERENCES dbo.student_subject_enrollments(id)
    ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.password_reset_tokens (
  id INT NOT NULL IDENTITY(1, 1),
  user_account_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME2 NOT NULL,
  CONSTRAINT password_reset_tokens_pk PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_token_hash_ux UNIQUE (token_hash),
  CONSTRAINT password_reset_tokens_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES dbo.user_accounts(id)
    ON DELETE CASCADE
);
GO

CREATE INDEX password_reset_tokens_user_account_idx
ON dbo.password_reset_tokens (user_account_id, expires_at);
GO

CREATE OR ALTER TRIGGER dbo.teacher_subject_assignments_validate_aiu
ON dbo.teacher_subject_assignments
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN dbo.lab_groups lg
      ON lg.id = i.lab_group_id
    JOIN dbo.subject_group_offerings sgo
      ON sgo.id = i.subject_group_offering_id
    WHERE lg.academic_group_id <> sgo.academic_group_id
  )
  BEGIN
    THROW 50001, 'Teacher assignment lab group must belong to the offering academic group.', 1;
  END;
END;
GO

CREATE OR ALTER TRIGGER dbo.student_subject_enrollments_validate_aiu
ON dbo.student_subject_enrollments
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN dbo.lab_groups lg
      ON lg.id = i.lab_group_id
    JOIN dbo.subject_group_offerings sgo
      ON sgo.id = i.subject_group_offering_id
    WHERE lg.academic_group_id <> sgo.academic_group_id
  )
  BEGIN
    THROW 50002, 'Student enrollment lab group must belong to the offering academic group.', 1;
  END;
END;
GO

CREATE OR ALTER TRIGGER dbo.lab_assignments_validate_aiu
ON dbo.lab_assignments
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        la.subject_group_offering_id,
        SUM(la.max_grade) AS allocated_grade
      FROM dbo.lab_assignments la
      WHERE la.subject_group_offering_id IN (
        SELECT DISTINCT subject_group_offering_id
        FROM inserted
      )
      GROUP BY la.subject_group_offering_id
    ) allocated
    JOIN dbo.subject_group_offerings sgo
      ON sgo.id = allocated.subject_group_offering_id
    WHERE allocated.allocated_grade > sgo.total_grade
  )
  BEGIN
    THROW 50003, 'Lab max grades cannot exceed the subject offering total grade.', 1;
  END;
END;
GO

CREATE OR ALTER TRIGGER dbo.student_lab_results_validate_aiu
ON dbo.student_lab_results
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (
    SELECT 1
    FROM inserted i
    LEFT JOIN dbo.student_subject_enrollments sse
      ON sse.id = i.student_subject_enrollment_id
    LEFT JOIN dbo.lab_assignments la
      ON la.id = i.lab_assignment_id
    WHERE sse.id IS NULL
      OR la.id IS NULL
      OR la.subject_group_offering_id <> sse.subject_group_offering_id
  )
  BEGIN
    THROW 50004, 'Lab result must match the student enrollment offering.', 1;
  END;

  IF EXISTS (
    SELECT 1
    FROM inserted i
    JOIN dbo.lab_assignments la
      ON la.id = i.lab_assignment_id
    WHERE i.grade IS NOT NULL
      AND i.grade > la.max_grade
  )
  BEGIN
    THROW 50005, 'Lab result grade cannot exceed the lab max grade.', 1;
  END;
END;
GO
