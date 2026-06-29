CREATE DATABASE IF NOT EXISTS labcheck
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE labcheck;

CREATE TABLE user_accounts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_type ENUM('ADMIN', 'TEACHER', 'STUDENT') NOT NULL,
  approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  last_login_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY user_accounts_email_ux (email),
  KEY user_accounts_approval_status_idx (approval_status),
  CONSTRAINT user_accounts_email_domain_chk
    CHECK (LOWER(email) LIKE '%@polytechnic.am')
) ENGINE=InnoDB;

CREATE TABLE academic_units (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit_type ENUM('INSTITUTE', 'FACULTY') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY academic_units_code_ux (code),
  UNIQUE KEY academic_units_name_ux (name)
) ENGINE=InnoDB;

CREATE TABLE specializations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    academic_unit_id INT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY specializations_code_ux (code),
    UNIQUE KEY specializations_name_ux (name),
    CONSTRAINT specializations_academic_unit_fk
        FOREIGN KEY (academic_unit_id) REFERENCES academic_units(id)
            ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE academic_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  specialization_id INT UNSIGNED NOT NULL,
  code INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY academic_groups_code_ux (code),
  CONSTRAINT academic_groups_specialization_fk
    FOREIGN KEY (specialization_id) REFERENCES specializations(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE lab_groups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_group_id INT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY lab_groups_code_ux (code),
  CONSTRAINT lab_groups_group_fk
    FOREIGN KEY (academic_group_id) REFERENCES academic_groups(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE subjects (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY subjects_code_ux (code)
) ENGINE=InnoDB;

CREATE TABLE admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_account_id INT UNSIGNED NOT NULL,
  academic_unit_id INT UNSIGNED NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  admin_level ENUM('SUPER_ADMIN', 'ACADEMIC_UNIT_ADMIN') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY admins_user_account_ux (user_account_id),
  UNIQUE KEY admins_academic_unit_ux (academic_unit_id),
  CONSTRAINT admins_scope_chk
    CHECK (
      (admin_level = 'SUPER_ADMIN' AND academic_unit_id IS NULL) OR
      (admin_level = 'ACADEMIC_UNIT_ADMIN' AND academic_unit_id IS NOT NULL)
    ),
  CONSTRAINT admins_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT admins_academic_unit_fk
    FOREIGN KEY (academic_unit_id) REFERENCES academic_units(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE teachers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_account_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY teachers_user_account_ux (user_account_id),
  CONSTRAINT teachers_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE students (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_account_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY students_user_account_ux (user_account_id),
  CONSTRAINT students_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE subject_group_offerings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_id INT UNSIGNED NOT NULL,
  academic_group_id INT UNSIGNED NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  semester ENUM('Fall', 'Spring') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_grade DECIMAL(4, 2) NOT NULL DEFAULT 16.00,
  PRIMARY KEY (id),
  UNIQUE KEY subject_group_offerings_ux (subject_id, academic_group_id, academic_year, semester),
  CONSTRAINT subject_group_offerings_total_grade_chk
    CHECK (total_grade > 0),
  CONSTRAINT subject_group_offerings_subject_fk
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
    ON DELETE CASCADE,
  CONSTRAINT subject_group_offerings_group_fk
    FOREIGN KEY (academic_group_id) REFERENCES academic_groups(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE teacher_subject_assignments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id INT UNSIGNED NOT NULL,
  subject_group_offering_id INT UNSIGNED NOT NULL,
  lab_group_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY teacher_subject_assignments_ux (teacher_id, subject_group_offering_id, lab_group_id),
  CONSTRAINT teacher_subject_assignments_teacher_fk
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    ON DELETE CASCADE,
  CONSTRAINT teacher_subject_assignments_offering_fk
    FOREIGN KEY (subject_group_offering_id) REFERENCES subject_group_offerings(id)
    ON DELETE CASCADE,
  CONSTRAINT teacher_subject_assignments_lab_group_fk
    FOREIGN KEY (lab_group_id) REFERENCES lab_groups(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE student_subject_enrollments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  subject_group_offering_id INT UNSIGNED NOT NULL,
  lab_group_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY student_subject_enrollments_ux (student_id, subject_group_offering_id),
  CONSTRAINT student_subject_enrollments_student_fk
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE,
  CONSTRAINT student_subject_enrollments_offering_fk
    FOREIGN KEY (subject_group_offering_id) REFERENCES subject_group_offerings(id)
    ON DELETE CASCADE,
  CONSTRAINT student_subject_enrollments_lab_group_fk
    FOREIGN KEY (lab_group_id) REFERENCES lab_groups(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE lab_assignments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_group_offering_id INT UNSIGNED NOT NULL,
  lab_number INT UNSIGNED NOT NULL,
  max_grade DECIMAL(4, 2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY lab_assignments_offering_number_ux (subject_group_offering_id, lab_number),
  CONSTRAINT lab_assignments_max_grade_chk
    CHECK (max_grade > 0),
  CONSTRAINT lab_assignments_offering_fk
    FOREIGN KEY (subject_group_offering_id) REFERENCES subject_group_offerings(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE student_lab_results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_assignment_id INT UNSIGNED NOT NULL,
  student_subject_enrollment_id INT UNSIGNED NOT NULL,
  attendance ENUM('PRESENT', 'ABSENT', 'EXCUSED', 'UNMARKED') NOT NULL DEFAULT 'UNMARKED',
  grade DECIMAL(4, 2) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY student_lab_results_ux (lab_assignment_id, student_subject_enrollment_id),
  CONSTRAINT student_lab_results_grade_chk
    CHECK (grade IS NULL OR (grade >= 0 AND grade <= 16)),
  CONSTRAINT student_lab_results_lab_fk
    FOREIGN KEY (lab_assignment_id) REFERENCES lab_assignments(id)
    ON DELETE CASCADE,
  CONSTRAINT student_lab_results_enrollment_fk
    FOREIGN KEY (student_subject_enrollment_id) REFERENCES student_subject_enrollments(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

DELIMITER $$

DROP TRIGGER IF EXISTS teacher_subject_assignments_validate_before_insert$$
CREATE TRIGGER teacher_subject_assignments_validate_before_insert
BEFORE INSERT ON teacher_subject_assignments
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM subject_group_offerings sgo
    JOIN lab_groups lg ON lg.id = NEW.lab_group_id
    WHERE sgo.id = NEW.subject_group_offering_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Teacher assignment lab group must belong to the offering academic group.';
  END IF;
END$$

DROP TRIGGER IF EXISTS teacher_subject_assignments_validate_before_update$$
CREATE TRIGGER teacher_subject_assignments_validate_before_update
BEFORE UPDATE ON teacher_subject_assignments
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM subject_group_offerings sgo
    JOIN lab_groups lg ON lg.id = NEW.lab_group_id
    WHERE sgo.id = NEW.subject_group_offering_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Teacher assignment lab group must belong to the offering academic group.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_subject_enrollments_validate_before_insert$$
CREATE TRIGGER student_subject_enrollments_validate_before_insert
BEFORE INSERT ON student_subject_enrollments
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM subject_group_offerings sgo
    JOIN lab_groups lg ON lg.id = NEW.lab_group_id
    WHERE sgo.id = NEW.subject_group_offering_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student enrollment lab group must belong to the offering academic group.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_subject_enrollments_validate_before_update$$
CREATE TRIGGER student_subject_enrollments_validate_before_update
BEFORE UPDATE ON student_subject_enrollments
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM subject_group_offerings sgo
    JOIN lab_groups lg ON lg.id = NEW.lab_group_id
    WHERE sgo.id = NEW.subject_group_offering_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student enrollment lab group must belong to the offering academic group.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_assignments_validate_before_insert$$
CREATE TRIGGER lab_assignments_validate_before_insert
BEFORE INSERT ON lab_assignments
FOR EACH ROW
BEGIN
  DECLARE v_total_grade DECIMAL(4, 2) DEFAULT NULL;
  DECLARE v_allocated_grade DECIMAL(6, 2) DEFAULT 0;

  SELECT
    sgo.total_grade
  INTO
    v_total_grade
  FROM subject_group_offerings sgo
  WHERE sgo.id = NEW.subject_group_offering_id
  LIMIT 1;

  IF v_total_grade IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Subject offering is required before saving a lab assignment.';
  END IF;

  SELECT
    COALESCE(SUM(la.max_grade), 0)
  INTO
    v_allocated_grade
  FROM lab_assignments la
  WHERE la.subject_group_offering_id = NEW.subject_group_offering_id;

  IF v_allocated_grade + NEW.max_grade > v_total_grade THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lab max grades cannot exceed the subject offering total grade.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_assignments_validate_before_update$$
CREATE TRIGGER lab_assignments_validate_before_update
BEFORE UPDATE ON lab_assignments
FOR EACH ROW
BEGIN
  DECLARE v_total_grade DECIMAL(4, 2) DEFAULT NULL;
  DECLARE v_allocated_grade DECIMAL(6, 2) DEFAULT 0;

  SELECT
    sgo.total_grade
  INTO
    v_total_grade
  FROM subject_group_offerings sgo
  WHERE sgo.id = NEW.subject_group_offering_id
  LIMIT 1;

  IF v_total_grade IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Subject offering is required before saving a lab assignment.';
  END IF;

  SELECT
    COALESCE(SUM(la.max_grade), 0)
  INTO
    v_allocated_grade
  FROM lab_assignments la
  WHERE la.subject_group_offering_id = NEW.subject_group_offering_id
    AND la.id <> OLD.id;

  IF v_allocated_grade + NEW.max_grade > v_total_grade THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lab max grades cannot exceed the subject offering total grade.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_lab_results_validate_before_insert$$
CREATE TRIGGER student_lab_results_validate_before_insert
BEFORE INSERT ON student_lab_results
FOR EACH ROW
BEGIN
  DECLARE v_subject_group_offering_id INT UNSIGNED DEFAULT NULL;
  DECLARE v_max_grade DECIMAL(4, 2) DEFAULT NULL;

  SELECT
    sse.subject_group_offering_id
  INTO
    v_subject_group_offering_id
  FROM student_subject_enrollments sse
  WHERE sse.id = NEW.student_subject_enrollment_id
  LIMIT 1;

  IF v_subject_group_offering_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student enrollment is required before saving a lab result.';
  END IF;

  SELECT
    la.max_grade
  INTO
    v_max_grade
  FROM lab_assignments la
  WHERE la.id = NEW.lab_assignment_id
    AND la.subject_group_offering_id = v_subject_group_offering_id
  LIMIT 1;

  IF v_max_grade IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lab result must match the student enrollment offering.';
  END IF;

  IF NEW.grade IS NOT NULL AND (v_max_grade IS NULL OR NEW.grade > v_max_grade) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lab result grade cannot exceed the lab max grade.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_lab_results_validate_before_update$$
CREATE TRIGGER student_lab_results_validate_before_update
BEFORE UPDATE ON student_lab_results
FOR EACH ROW
BEGIN
  DECLARE v_subject_group_offering_id INT UNSIGNED DEFAULT NULL;
  DECLARE v_max_grade DECIMAL(4, 2) DEFAULT NULL;

  SELECT
    sse.subject_group_offering_id
  INTO
    v_subject_group_offering_id
  FROM student_subject_enrollments sse
  WHERE sse.id = NEW.student_subject_enrollment_id
  LIMIT 1;

  IF v_subject_group_offering_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student enrollment is required before saving a lab result.';
  END IF;

  SELECT
    la.max_grade
  INTO
    v_max_grade
  FROM lab_assignments la
  WHERE la.id = NEW.lab_assignment_id
    AND la.subject_group_offering_id = v_subject_group_offering_id
  LIMIT 1;

  IF v_max_grade IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lab result must match the student enrollment offering.';
  END IF;

  IF NEW.grade IS NOT NULL AND (v_max_grade IS NULL OR NEW.grade > v_max_grade) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lab result grade cannot exceed the lab max grade.';
  END IF;
END$$

DELIMITER ;

CREATE TABLE password_reset_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_account_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY password_reset_tokens_token_hash_ux (token_hash),
  KEY password_reset_tokens_user_account_idx (user_account_id, expires_at),
  CONSTRAINT password_reset_tokens_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
