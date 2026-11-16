CREATE TABLE IF NOT EXISTS lab_group_midterm_locks (
  subject_group_offering_id INT UNSIGNED NOT NULL,
  lab_group_id INT UNSIGNED NOT NULL,
  midterm_no TINYINT UNSIGNED NOT NULL,
  locked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_by_teacher_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (subject_group_offering_id, lab_group_id, midterm_no),
  CONSTRAINT group_lock_midterm_fk FOREIGN KEY (subject_group_offering_id, midterm_no)
    REFERENCES offering_midterms(subject_group_offering_id, midterm_no) ON DELETE RESTRICT,
  CONSTRAINT group_lock_group_fk FOREIGN KEY (lab_group_id) REFERENCES lab_groups(id) ON DELETE RESTRICT,
  CONSTRAINT group_lock_teacher_fk FOREIGN KEY (locked_by_teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

DELIMITER $$
DROP TRIGGER IF EXISTS group_midterm_lock_validate$$
CREATE TRIGGER group_midterm_lock_validate
BEFORE INSERT ON lab_group_midterm_locks
FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teacher_subject_assignments
      WHERE teacher_id = NEW.locked_by_teacher_id AND lab_group_id = NEW.lab_group_id
        AND subject_group_offering_id = NEW.subject_group_offering_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an assigned teacher can finish this lab group.';
  END IF;
  IF NEW.midterm_no = 2 AND NOT EXISTS (SELECT 1 FROM lab_group_midterm_locks
      WHERE subject_group_offering_id = NEW.subject_group_offering_id
        AND lab_group_id = NEW.lab_group_id AND midterm_no = 1)
    AND NOT EXISTS (SELECT 1 FROM offering_midterms WHERE subject_group_offering_id = NEW.subject_group_offering_id
        AND midterm_no = 1 AND status = 'LOCKED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Finish Midterm 1 for this group first.';
  END IF;
  IF (SELECT COALESCE(SUM(max_grade), 0) FROM lab_assignments
      WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = NEW.midterm_no) <> 16 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm labs must total exactly 16 points.';
  END IF;
  IF EXISTS (SELECT 1 FROM student_subject_enrollments e
      LEFT JOIN student_midterm_results r ON r.student_subject_enrollment_id = e.id AND r.midterm_no = NEW.midterm_no
      WHERE e.subject_group_offering_id = NEW.subject_group_offering_id AND e.lab_group_id = NEW.lab_group_id
        AND (r.exam_score IS NULL OR EXISTS (SELECT 1 FROM lab_assignments la
          LEFT JOIN student_lab_results slr ON slr.lab_assignment_id = la.id AND slr.student_subject_enrollment_id = e.id
          WHERE la.subject_group_offering_id = NEW.subject_group_offering_id AND la.midterm_no = NEW.midterm_no
            AND (slr.grade IS NULL OR slr.attendance = 'UNMARKED')))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Complete grades, attendance, and exam scores for this lab group first.';
  END IF;
END$$

DROP TRIGGER IF EXISTS group_midterm_lock_no_update$$
CREATE TRIGGER group_midterm_lock_no_update
BEFORE UPDATE ON lab_group_midterm_locks
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A finished lab group cannot be reopened or changed.';
END$$

DROP TRIGGER IF EXISTS group_midterm_lock_no_delete$$
CREATE TRIGGER group_midterm_lock_no_delete
BEFORE DELETE ON lab_group_midterm_locks
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A finished lab group cannot be reopened or changed.';
END$$

DROP TRIGGER IF EXISTS student_lab_results_group_lock_insert$$
CREATE TRIGGER student_lab_results_group_lock_insert
BEFORE INSERT ON student_lab_results
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM student_subject_enrollments e
        JOIN lab_assignments la ON la.id = NEW.lab_assignment_id
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = la.midterm_no
        WHERE e.id = NEW.student_subject_enrollment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This lab group midterm is finished.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_lab_results_group_lock_update$$
CREATE TRIGGER student_lab_results_group_lock_update
BEFORE UPDATE ON student_lab_results
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM student_subject_enrollments e
        JOIN lab_assignments la ON la.id = OLD.lab_assignment_id
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = la.midterm_no
        WHERE e.id = OLD.student_subject_enrollment_id) OR EXISTS (SELECT 1 FROM student_subject_enrollments e
        JOIN lab_assignments la ON la.id = NEW.lab_assignment_id
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = la.midterm_no
        WHERE e.id = NEW.student_subject_enrollment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This lab group midterm is finished.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_lab_results_group_lock_delete$$
CREATE TRIGGER student_lab_results_group_lock_delete
BEFORE DELETE ON student_lab_results
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM student_subject_enrollments e
        JOIN lab_assignments la ON la.id = OLD.lab_assignment_id
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = la.midterm_no
        WHERE e.id = OLD.student_subject_enrollment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This lab group midterm is finished.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_midterm_results_group_lock_insert$$
CREATE TRIGGER student_midterm_results_group_lock_insert
BEFORE INSERT ON student_midterm_results
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM student_subject_enrollments e
        
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = NEW.midterm_no
        WHERE e.id = NEW.student_subject_enrollment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This lab group midterm is finished.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_midterm_results_group_lock_update$$
CREATE TRIGGER student_midterm_results_group_lock_update
BEFORE UPDATE ON student_midterm_results
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM student_subject_enrollments e
        
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = OLD.midterm_no
        WHERE e.id = OLD.student_subject_enrollment_id) OR EXISTS (SELECT 1 FROM student_subject_enrollments e
        
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = NEW.midterm_no
        WHERE e.id = NEW.student_subject_enrollment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This lab group midterm is finished.';
  END IF;
END$$

DROP TRIGGER IF EXISTS student_midterm_results_group_lock_delete$$
CREATE TRIGGER student_midterm_results_group_lock_delete
BEFORE DELETE ON student_midterm_results
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM student_subject_enrollments e
        
        JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = e.subject_group_offering_id
          AND l.lab_group_id = e.lab_group_id AND l.midterm_no = OLD.midterm_no
        WHERE e.id = OLD.student_subject_enrollment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This lab group midterm is finished.';
  END IF;
END$$

DROP TRIGGER IF EXISTS lab_assignments_validate_before_insert$$
CREATE TRIGGER lab_assignments_validate_before_insert
BEFORE INSERT ON lab_assignments
FOR EACH ROW
BEGIN
  DECLARE v_total_grade DECIMAL(4, 2) DEFAULT NULL;
  DECLARE v_allocated_grade DECIMAL(6, 2) DEFAULT 0;

  IF EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = NEW.midterm_no) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shared lab assignments are read-only after a lab group finishes this midterm.';
  END IF;
  IF (SELECT status FROM offering_midterms WHERE subject_group_offering_id = NEW.subject_group_offering_id
      AND midterm_no = NEW.midterm_no) <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
  IF NEW.midterm_no = 2 AND (SELECT status FROM offering_midterms
      WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) <> 'LOCKED' AND NOT EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) THEN
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

  IF EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = OLD.subject_group_offering_id AND midterm_no = OLD.midterm_no) OR EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = NEW.midterm_no) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shared lab assignments are read-only after a lab group finishes this midterm.';
  END IF;
  IF (SELECT status FROM offering_midterms WHERE subject_group_offering_id = OLD.subject_group_offering_id
      AND midterm_no = OLD.midterm_no) <> 'OPEN' OR
     (SELECT status FROM offering_midterms WHERE subject_group_offering_id = NEW.subject_group_offering_id
      AND midterm_no = NEW.midterm_no) <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
  IF NEW.midterm_no = 2 AND (SELECT status FROM offering_midterms
      WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) <> 'LOCKED' AND NOT EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) THEN
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
  IF EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = OLD.subject_group_offering_id AND midterm_no = OLD.midterm_no) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shared lab assignments are read-only after a lab group finishes this midterm.';
  END IF;
  IF (SELECT status FROM offering_midterms WHERE subject_group_offering_id = OLD.subject_group_offering_id
      AND midterm_no = OLD.midterm_no) = 'LOCKED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Midterm is locked.';
  END IF;
END$$

DROP TRIGGER IF EXISTS enrollment_group_lock_insert$$
CREATE TRIGGER enrollment_group_lock_insert
BEFORE INSERT ON student_subject_enrollments
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = NEW.subject_group_offering_id AND lab_group_id = NEW.lab_group_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change enrollment after its lab group finishes a midterm.';
  END IF;
END$$

DROP TRIGGER IF EXISTS enrollment_group_lock_update$$
CREATE TRIGGER enrollment_group_lock_update
BEFORE UPDATE ON student_subject_enrollments
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = OLD.subject_group_offering_id AND lab_group_id = OLD.lab_group_id) OR EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = NEW.subject_group_offering_id AND lab_group_id = NEW.lab_group_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change enrollment after its lab group finishes a midterm.';
  END IF;
END$$

DROP TRIGGER IF EXISTS enrollment_group_lock_delete$$
CREATE TRIGGER enrollment_group_lock_delete
BEFORE DELETE ON student_subject_enrollments
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = OLD.subject_group_offering_id AND lab_group_id = OLD.lab_group_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change enrollment after its lab group finishes a midterm.';
  END IF;
END$$

DROP TRIGGER IF EXISTS attachment_group_lock_insert$$
CREATE TRIGGER attachment_group_lock_insert
BEFORE INSERT ON lab_attachments
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_assignments la JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = la.subject_group_offering_id AND l.midterm_no = la.midterm_no WHERE la.id = NEW.lab_assignment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shared lab attachments are read-only after a lab group finishes this midterm.';
  END IF;
END$$

DROP TRIGGER IF EXISTS attachment_group_lock_update$$
CREATE TRIGGER attachment_group_lock_update
BEFORE UPDATE ON lab_attachments
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_assignments la JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = la.subject_group_offering_id AND l.midterm_no = la.midterm_no WHERE la.id = OLD.lab_assignment_id) OR EXISTS (SELECT 1 FROM lab_assignments la JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = la.subject_group_offering_id AND l.midterm_no = la.midterm_no WHERE la.id = NEW.lab_assignment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shared lab attachments are read-only after a lab group finishes this midterm.';
  END IF;
END$$

DROP TRIGGER IF EXISTS attachment_group_lock_delete$$
CREATE TRIGGER attachment_group_lock_delete
BEFORE DELETE ON lab_attachments
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM lab_assignments la JOIN lab_group_midterm_locks l ON l.subject_group_offering_id = la.subject_group_offering_id AND l.midterm_no = la.midterm_no WHERE la.id = OLD.lab_assignment_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Shared lab attachments are read-only after a lab group finishes this midterm.';
  END IF;
END$$

DELIMITER ;
