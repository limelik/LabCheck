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
  email_verified_at DATETIME NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_by_user_account_id INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  last_login_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY user_accounts_email_ux (email),
  KEY user_accounts_approval_status_idx (approval_status),
  CONSTRAINT user_accounts_reviewer_fk
    FOREIGN KEY (reviewed_by_user_account_id) REFERENCES user_accounts(id)
    ON DELETE SET NULL,
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
  code VARCHAR(50) NOT NULL,
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
  academic_group_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY students_user_account_ux (user_account_id),
  CONSTRAINT students_user_account_fk
    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT students_academic_group_fk
    FOREIGN KEY (academic_group_id) REFERENCES academic_groups(id)
    ON DELETE RESTRICT
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
    CHECK (total_grade = 16),
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
  UNIQUE KEY teacher_subject_assignments_one_teacher_ux (subject_group_offering_id, lab_group_id),
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
  default_lab_group_id INT UNSIGNED NOT NULL,
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
    ON DELETE RESTRICT,
  CONSTRAINT student_subject_enrollments_default_lab_group_fk
    FOREIGN KEY (default_lab_group_id) REFERENCES lab_groups(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE offering_midterms (
  subject_group_offering_id INT UNSIGNED NOT NULL,
  midterm_no TINYINT UNSIGNED NOT NULL,
  status ENUM('OPEN', 'LOCKED') NOT NULL DEFAULT 'OPEN',
  locked_at DATETIME NULL,
  locked_by_teacher_id INT UNSIGNED NULL,
  PRIMARY KEY (subject_group_offering_id, midterm_no),
  CONSTRAINT offering_midterms_number_chk CHECK (midterm_no IN (1, 2)),
  CONSTRAINT offering_midterms_offering_fk
    FOREIGN KEY (subject_group_offering_id) REFERENCES subject_group_offerings(id)
    ON DELETE CASCADE,
  CONSTRAINT offering_midterms_teacher_fk
    FOREIGN KEY (locked_by_teacher_id) REFERENCES teachers(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE lab_assignments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_group_offering_id INT UNSIGNED NOT NULL,
  midterm_no TINYINT UNSIGNED NOT NULL,
  lab_number INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  max_grade TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY lab_assignments_offering_number_ux (subject_group_offering_id, lab_number),
  KEY lab_assignments_midterm_idx (subject_group_offering_id, midterm_no),
  CONSTRAINT lab_assignments_max_grade_chk
    CHECK (max_grade BETWEEN 1 AND 5),
  CONSTRAINT lab_assignments_midterm_fk
    FOREIGN KEY (subject_group_offering_id, midterm_no)
    REFERENCES offering_midterms(subject_group_offering_id, midterm_no)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE student_lab_results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_assignment_id INT UNSIGNED NOT NULL,
  student_subject_enrollment_id INT UNSIGNED NOT NULL,
  attendance ENUM('PRESENT', 'ABSENT', 'EXCUSED', 'UNMARKED') NOT NULL DEFAULT 'UNMARKED',
  grade TINYINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY student_lab_results_ux (lab_assignment_id, student_subject_enrollment_id),
  CONSTRAINT student_lab_results_grade_chk
    CHECK (grade IS NULL OR grade <= 16),
  CONSTRAINT student_lab_results_lab_fk
    FOREIGN KEY (lab_assignment_id) REFERENCES lab_assignments(id)
    ON DELETE CASCADE,
  CONSTRAINT student_lab_results_enrollment_fk
    FOREIGN KEY (student_subject_enrollment_id) REFERENCES student_subject_enrollments(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE student_midterm_results (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_subject_enrollment_id INT UNSIGNED NOT NULL,
  midterm_no TINYINT UNSIGNED NOT NULL,
  exam_score TINYINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY student_midterm_results_enrollment_midterm_ux
    (student_subject_enrollment_id, midterm_no),
  CONSTRAINT student_midterm_results_exam_score_chk
    CHECK (exam_score IS NULL OR exam_score <= 4),
  CONSTRAINT student_midterm_results_number_chk
    CHECK (midterm_no IN (1, 2)),
  CONSTRAINT student_midterm_results_enrollment_fk
    FOREIGN KEY (student_subject_enrollment_id) REFERENCES student_subject_enrollments(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE lab_change_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_subject_enrollment_id INT UNSIGNED NOT NULL,
  current_lab_group_id INT UNSIGNED NOT NULL,
  requested_lab_group_id INT UNSIGNED NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  decided_by_teacher_id INT UNSIGNED NULL,
  pending_enrollment_id INT UNSIGNED GENERATED ALWAYS AS
    (CASE WHEN status = 'PENDING' THEN student_subject_enrollment_id ELSE NULL END) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY lab_change_requests_one_pending_ux (pending_enrollment_id),
  CONSTRAINT lab_change_requests_different_group_chk
    CHECK (current_lab_group_id <> requested_lab_group_id),
  CONSTRAINT lab_change_requests_decision_chk
    CHECK ((status = 'PENDING' AND decided_at IS NULL AND decided_by_teacher_id IS NULL)
      OR (status <> 'PENDING' AND decided_at IS NOT NULL AND decided_by_teacher_id IS NOT NULL)),
  CONSTRAINT lab_change_requests_enrollment_fk
    FOREIGN KEY (student_subject_enrollment_id) REFERENCES student_subject_enrollments(id)
    ON DELETE CASCADE,
  CONSTRAINT lab_change_requests_current_group_fk
    FOREIGN KEY (current_lab_group_id) REFERENCES lab_groups(id)
    ON DELETE RESTRICT,
  CONSTRAINT lab_change_requests_requested_group_fk
    FOREIGN KEY (requested_lab_group_id) REFERENCES lab_groups(id)
    ON DELETE RESTRICT,
  CONSTRAINT lab_change_requests_teacher_fk
    FOREIGN KEY (decided_by_teacher_id) REFERENCES teachers(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE email_verification_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_account_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email_verification_tokens_hash_ux (token_hash),
  CONSTRAINT email_verification_tokens_account_fk
    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id)
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
  DECLARE v_lab_group_id INT UNSIGNED;
  SELECT id INTO v_lab_group_id FROM lab_groups WHERE id = NEW.lab_group_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM offering_midterms
             WHERE subject_group_offering_id = NEW.subject_group_offering_id
               AND status = 'LOCKED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot add a student after a midterm is locked.';
  END IF;
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
  IF NOT EXISTS (
    SELECT 1 FROM students s
    JOIN subject_group_offerings sgo ON sgo.academic_group_id = s.academic_group_id
    JOIN lab_groups lg ON lg.id = NEW.default_lab_group_id
    WHERE s.id = NEW.student_id AND sgo.id = NEW.subject_group_offering_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student and default lab group must belong to the offering academic group.';
  END IF;
  IF (SELECT COUNT(*) FROM student_subject_enrollments
      WHERE subject_group_offering_id = NEW.subject_group_offering_id
        AND lab_group_id = NEW.lab_group_id) >= 16 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lab group is full.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_subject_enrollments_validate_before_update$$
CREATE TRIGGER student_subject_enrollments_validate_before_update
BEFORE UPDATE ON student_subject_enrollments
FOR EACH ROW
BEGIN
  DECLARE v_lab_group_id INT UNSIGNED;
  SELECT id INTO v_lab_group_id FROM lab_groups WHERE id = NEW.lab_group_id FOR UPDATE;
  IF (NEW.subject_group_offering_id <> OLD.subject_group_offering_id OR
      NEW.student_id <> OLD.student_id) AND
      EXISTS (SELECT 1 FROM offering_midterms
              WHERE subject_group_offering_id IN
                (OLD.subject_group_offering_id, NEW.subject_group_offering_id)
                AND status = 'LOCKED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot move an enrollment after a midterm is locked.';
  END IF;
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
  IF NOT EXISTS (
    SELECT 1 FROM students s
    JOIN subject_group_offerings sgo ON sgo.academic_group_id = s.academic_group_id
    JOIN lab_groups lg ON lg.id = NEW.default_lab_group_id
    WHERE s.id = NEW.student_id AND sgo.id = NEW.subject_group_offering_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Student and default lab group must belong to the offering academic group.';
  END IF;
  IF (NEW.lab_group_id <> OLD.lab_group_id OR
      NEW.subject_group_offering_id <> OLD.subject_group_offering_id) AND
      (SELECT COUNT(*) FROM student_subject_enrollments
       WHERE subject_group_offering_id = NEW.subject_group_offering_id
         AND lab_group_id = NEW.lab_group_id AND id <> OLD.id) >= 16 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lab group is full.';
  END IF;
  IF (NEW.subject_group_offering_id <> OLD.subject_group_offering_id OR
      NEW.student_id <> OLD.student_id) AND
      (EXISTS (SELECT 1 FROM student_lab_results
              WHERE student_subject_enrollment_id = OLD.id) OR
       EXISTS (SELECT 1 FROM student_midterm_results
              WHERE student_subject_enrollment_id = OLD.id)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Enrollment with results cannot change student or offering.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_subject_enrollments_validate_before_delete$$
CREATE TRIGGER student_subject_enrollments_validate_before_delete
BEFORE DELETE ON student_subject_enrollments
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM offering_midterms
             WHERE subject_group_offering_id = OLD.subject_group_offering_id
               AND status = 'LOCKED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot remove a student after a midterm is locked.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_assignments_validate_before_insert$$
CREATE TRIGGER lab_assignments_validate_before_insert
BEFORE INSERT ON lab_assignments
FOR EACH ROW
BEGIN
  DECLARE v_total_grade DECIMAL(4, 2) DEFAULT NULL;
  DECLARE v_allocated_grade DECIMAL(6, 2) DEFAULT 0;

  IF (SELECT status FROM offering_midterms WHERE subject_group_offering_id = NEW.subject_group_offering_id
      AND midterm_no = NEW.midterm_no) <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
  IF NEW.midterm_no = 2 AND (SELECT status FROM offering_midterms
      WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) <> 'LOCKED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lock the first midterm before adding second-midterm labs.';
  END IF;
  IF (SELECT COUNT(*) FROM lab_assignments WHERE subject_group_offering_id = NEW.subject_group_offering_id) >= 14 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An offering can have at most 14 labs.';
  END IF;

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
    AND la.midterm_no = NEW.midterm_no;

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

  IF (SELECT status FROM offering_midterms WHERE subject_group_offering_id = OLD.subject_group_offering_id
      AND midterm_no = OLD.midterm_no) <> 'OPEN' OR
     (SELECT status FROM offering_midterms WHERE subject_group_offering_id = NEW.subject_group_offering_id
      AND midterm_no = NEW.midterm_no) <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
  IF NEW.midterm_no = 2 AND (SELECT status FROM offering_midterms
      WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) <> 'LOCKED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lock the first midterm before adding second-midterm labs.';
  END IF;
  IF EXISTS (SELECT 1 FROM student_lab_results WHERE lab_assignment_id = OLD.id AND grade > NEW.max_grade) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Existing result exceeds the new lab maximum.';
  END IF;
  IF (NEW.subject_group_offering_id <> OLD.subject_group_offering_id OR
      NEW.midterm_no <> OLD.midterm_no) AND
      EXISTS (SELECT 1 FROM student_lab_results WHERE lab_assignment_id = OLD.id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lab with results cannot move to another offering or midterm.';
  END IF;
  IF NEW.subject_group_offering_id <> OLD.subject_group_offering_id AND
      (SELECT COUNT(*) FROM lab_assignments
       WHERE subject_group_offering_id = NEW.subject_group_offering_id) >= 14 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An offering can have at most 14 labs.';
  END IF;

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
    AND la.midterm_no = NEW.midterm_no
    AND la.id <> OLD.id;

  IF v_allocated_grade + NEW.max_grade > v_total_grade THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lab max grades cannot exceed the subject offering total grade.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_assignments_validate_before_delete$$
CREATE TRIGGER lab_assignments_validate_before_delete
BEFORE DELETE ON lab_assignments
FOR EACH ROW
BEGIN
  IF (SELECT status FROM offering_midterms WHERE subject_group_offering_id = OLD.subject_group_offering_id
      AND midterm_no = OLD.midterm_no) = 'LOCKED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_lab_results_validate_before_insert$$
CREATE TRIGGER student_lab_results_validate_before_insert
BEFORE INSERT ON student_lab_results
FOR EACH ROW
BEGIN
  DECLARE v_subject_group_offering_id INT UNSIGNED DEFAULT NULL;
  DECLARE v_max_grade DECIMAL(4, 2) DEFAULT NULL;

  IF EXISTS (SELECT 1 FROM lab_assignments la JOIN offering_midterms om
      ON om.subject_group_offering_id = la.subject_group_offering_id AND om.midterm_no = la.midterm_no
      WHERE la.id = NEW.lab_assignment_id AND om.status = 'LOCKED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;

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

  IF EXISTS (SELECT 1 FROM lab_assignments la JOIN offering_midterms om
      ON om.subject_group_offering_id = la.subject_group_offering_id AND om.midterm_no = la.midterm_no
      WHERE la.id IN (OLD.lab_assignment_id, NEW.lab_assignment_id) AND om.status = 'LOCKED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;

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

DROP TRIGGER IF EXISTS student_lab_results_validate_before_delete$$
CREATE TRIGGER student_lab_results_validate_before_delete
BEFORE DELETE ON student_lab_results
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_assignments la JOIN offering_midterms om
      ON om.subject_group_offering_id = la.subject_group_offering_id AND om.midterm_no = la.midterm_no
      WHERE la.id = OLD.lab_assignment_id AND om.status = 'LOCKED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_midterm_results_validate_before_insert$$
CREATE TRIGGER student_midterm_results_validate_before_insert
BEFORE INSERT ON student_midterm_results
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM student_subject_enrollments sse
    JOIN offering_midterms om ON om.subject_group_offering_id = sse.subject_group_offering_id
    WHERE sse.id = NEW.student_subject_enrollment_id
      AND om.midterm_no = NEW.midterm_no AND om.status = 'OPEN'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exam result needs an open midterm for the enrollment.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_midterm_results_validate_before_update$$
CREATE TRIGGER student_midterm_results_validate_before_update
BEFORE UPDATE ON student_midterm_results
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM student_subject_enrollments sse
    JOIN offering_midterms om ON om.subject_group_offering_id = sse.subject_group_offering_id
    WHERE sse.id = NEW.student_subject_enrollment_id
      AND om.midterm_no = NEW.midterm_no AND om.status = 'OPEN'
  ) OR NOT EXISTS (
    SELECT 1 FROM student_subject_enrollments sse
    JOIN offering_midterms om ON om.subject_group_offering_id = sse.subject_group_offering_id
    WHERE sse.id = OLD.student_subject_enrollment_id
      AND om.midterm_no = OLD.midterm_no AND om.status = 'OPEN'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exam result belongs to a locked or invalid midterm.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_midterm_results_validate_before_delete$$
CREATE TRIGGER student_midterm_results_validate_before_delete
BEFORE DELETE ON student_midterm_results
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM student_subject_enrollments sse
    JOIN offering_midterms om ON om.subject_group_offering_id = sse.subject_group_offering_id
    WHERE sse.id = OLD.student_subject_enrollment_id
      AND om.midterm_no = OLD.midterm_no AND om.status = 'LOCKED'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
END$$

DROP TRIGGER IF EXISTS offering_midterms_validate_before_update$$
CREATE TRIGGER offering_midterms_validate_before_update
BEFORE UPDATE ON offering_midterms
FOR EACH ROW
BEGIN
  DECLARE v_lab_points INT UNSIGNED DEFAULT 0;
  IF OLD.status = 'LOCKED' AND NEW.status <> 'LOCKED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A locked midterm cannot be reopened.';
  END IF;
  IF OLD.status = 'LOCKED' AND (
      NEW.subject_group_offering_id <> OLD.subject_group_offering_id OR
      NEW.midterm_no <> OLD.midterm_no OR
      NOT (NEW.locked_at <=> OLD.locked_at) OR
      NOT (NEW.locked_by_teacher_id <=> OLD.locked_by_teacher_id)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A locked midterm cannot be changed.';
  END IF;
  IF NEW.status = 'LOCKED' AND OLD.status = 'OPEN' THEN
    SELECT COALESCE(SUM(max_grade), 0)
    INTO v_lab_points
    FROM lab_assignments
    WHERE subject_group_offering_id = NEW.subject_group_offering_id
      AND midterm_no = NEW.midterm_no;
    IF v_lab_points <> 16 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm lab maximum grades must total exactly 16 points before locking.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM student_subject_enrollments sse
      WHERE sse.subject_group_offering_id = NEW.subject_group_offering_id
        AND (
          NOT EXISTS (
            SELECT 1 FROM student_midterm_results smr
            WHERE smr.student_subject_enrollment_id = sse.id
              AND smr.midterm_no = NEW.midterm_no
              AND smr.exam_score IS NOT NULL
          ) OR EXISTS (
            SELECT 1 FROM lab_assignments la
            LEFT JOIN student_lab_results slr
              ON slr.lab_assignment_id = la.id
              AND slr.student_subject_enrollment_id = sse.id
            WHERE la.subject_group_offering_id = NEW.subject_group_offering_id
              AND la.midterm_no = NEW.midterm_no
              AND (slr.grade IS NULL OR slr.attendance = 'UNMARKED')
          )
        )
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Every enrolled student needs lab grades, attendance, and an exam score before locking.';
    END IF;
    IF NEW.midterm_no = 2 AND NOT EXISTS (
      SELECT 1 FROM offering_midterms
      WHERE subject_group_offering_id = NEW.subject_group_offering_id
        AND midterm_no = 1 AND status = 'LOCKED'
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lock the first midterm before the second.';
    END IF;
    IF NEW.locked_at IS NULL OR NEW.locked_by_teacher_id IS NULL OR
       NOT EXISTS (SELECT 1 FROM teacher_subject_assignments
                   WHERE teacher_id = NEW.locked_by_teacher_id
                     AND subject_group_offering_id = NEW.subject_group_offering_id) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An assigned teacher and lock time are required.';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS offering_midterms_validate_before_delete$$
CREATE TRIGGER offering_midterms_validate_before_delete
BEFORE DELETE ON offering_midterms
FOR EACH ROW
BEGIN
  IF OLD.status = 'LOCKED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A locked midterm cannot be deleted.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_change_requests_validate_before_insert$$
CREATE TRIGGER lab_change_requests_validate_before_insert
BEFORE INSERT ON lab_change_requests
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM student_subject_enrollments sse
    JOIN subject_group_offerings sgo ON sgo.id = sse.subject_group_offering_id
    JOIN lab_groups lg ON lg.id = NEW.requested_lab_group_id
    WHERE sse.id = NEW.student_subject_enrollment_id
      AND sse.lab_group_id = NEW.current_lab_group_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lab change request does not match current placement.';
  END IF;
  IF NEW.status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A new request must be pending.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_change_requests_validate_before_update$$
CREATE TRIGGER lab_change_requests_validate_before_update
BEFORE UPDATE ON lab_change_requests
FOR EACH ROW
BEGIN
  IF OLD.status <> 'PENDING' OR NEW.student_subject_enrollment_id <> OLD.student_subject_enrollment_id OR
     NEW.current_lab_group_id <> OLD.current_lab_group_id OR
     NEW.requested_lab_group_id <> OLD.requested_lab_group_id OR NEW.status = 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a pending request can be decided.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM student_subject_enrollments sse
    JOIN teacher_subject_assignments tsa ON tsa.subject_group_offering_id = sse.subject_group_offering_id
    WHERE sse.id = NEW.student_subject_enrollment_id
      AND sse.lab_group_id = NEW.current_lab_group_id
      AND tsa.teacher_id = NEW.decided_by_teacher_id
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assigned teacher and current placement are required.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_change_requests_apply_after_update$$
CREATE TRIGGER lab_change_requests_apply_after_update
AFTER UPDATE ON lab_change_requests
FOR EACH ROW
BEGIN
  IF NEW.status = 'APPROVED' THEN
    UPDATE student_subject_enrollments
    SET lab_group_id = NEW.requested_lab_group_id
    WHERE id = NEW.student_subject_enrollment_id;
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

CREATE OR REPLACE VIEW student_midterm_progress AS
SELECT
  progress.student_subject_enrollment_id,
  progress.midterm_no,
  progress.lab_count,
  progress.absences,
  progress.lab_points,
  progress.exam_points,
  CASE
    WHEN progress.lab_points IS NULL OR progress.exam_points IS NULL THEN NULL
    ELSE progress.lab_points + progress.exam_points
  END AS overall_points,
  progress.eligibility
FROM (
  SELECT
    sse.id AS student_subject_enrollment_id,
    om.midterm_no,
    COUNT(la.id) AS lab_count,
    COALESCE(SUM(CASE WHEN slr.attendance = 'ABSENT' THEN 1 ELSE 0 END), 0) AS absences,
    CASE
      WHEN COUNT(la.id) = 0 OR
        SUM(CASE WHEN la.id IS NOT NULL AND slr.grade IS NULL THEN 1 ELSE 0 END) > 0
      THEN NULL
      ELSE COALESCE(SUM(slr.grade), 0)
    END AS lab_points,
    MAX(smr.exam_score) AS exam_points,
    CASE
      WHEN COALESCE(SUM(CASE WHEN slr.attendance = 'ABSENT' THEN 1 ELSE 0 END), 0)
        >= 3 THEN 'NOT_ALLOWED'
      ELSE 'ALLOWED'
    END AS eligibility
  FROM student_subject_enrollments sse
  JOIN subject_group_offerings sgo ON sgo.id = sse.subject_group_offering_id
  JOIN offering_midterms om ON om.subject_group_offering_id = sgo.id
  LEFT JOIN lab_assignments la ON la.subject_group_offering_id = om.subject_group_offering_id
    AND la.midterm_no = om.midterm_no
  LEFT JOIN student_lab_results slr ON slr.lab_assignment_id = la.id
    AND slr.student_subject_enrollment_id = sse.id
  LEFT JOIN student_midterm_results smr
    ON smr.student_subject_enrollment_id = sse.id AND smr.midterm_no = om.midterm_no
  GROUP BY sse.id, om.midterm_no
) AS progress;
