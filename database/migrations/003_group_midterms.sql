CREATE TABLE IF NOT EXISTS lab_group_midterms (
 offering_id INT UNSIGNED NOT NULL,
 lab_group_id INT UNSIGNED NOT NULL,
 midterm_no TINYINT UNSIGNED NOT NULL,
 is_locked BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY(offering_id,lab_group_id,midterm_no),
 FOREIGN KEY(offering_id) REFERENCES subject_group_offerings(id) ON DELETE CASCADE,
 FOREIGN KEY(lab_group_id) REFERENCES lab_groups(id) ON DELETE CASCADE,
 CHECK(midterm_no IN (1,2))
);
CREATE TABLE IF NOT EXISTS teacher_midterm_starts (
 offering_id INT UNSIGNED NOT NULL,
 teacher_id INT UNSIGNED NOT NULL,
 PRIMARY KEY(offering_id,teacher_id),
 FOREIGN KEY(offering_id) REFERENCES subject_group_offerings(id) ON DELETE CASCADE,
 FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

DELIMITER $$
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
      WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) <> 'LOCKED' AND NOT EXISTS (SELECT 1 FROM teacher_midterm_starts WHERE offering_id=NEW.subject_group_offering_id) THEN
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
      SET MESSAGE_TEXT = 'Lab max grades cannot exceed the subject total grade.';
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
      WHERE subject_group_offering_id = NEW.subject_group_offering_id AND midterm_no = 1) <> 'LOCKED' AND NOT EXISTS (SELECT 1 FROM teacher_midterm_starts WHERE offering_id=NEW.subject_group_offering_id) THEN
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
      SET MESSAGE_TEXT = 'Lab max grades cannot exceed the subject total grade.';
  END IF;
END$$
DELIMITER ;

INSERT IGNORE INTO lab_group_midterms(offering_id,lab_group_id,midterm_no,is_locked)
SELECT om.subject_group_offering_id, lg.id, om.midterm_no, TRUE FROM offering_midterms om JOIN subject_group_offerings o ON o.id=om.subject_group_offering_id JOIN lab_groups lg ON lg.academic_group_id=o.academic_group_id WHERE om.status='LOCKED';
INSERT IGNORE INTO teacher_midterm_starts(offering_id,teacher_id)
SELECT om.subject_group_offering_id,tsa.teacher_id FROM offering_midterms om JOIN teacher_subject_assignments tsa ON tsa.subject_group_offering_id=om.subject_group_offering_id WHERE om.midterm_no=1 AND om.status='LOCKED';
DROP TRIGGER IF EXISTS offering_midterms_validate_before_update;
UPDATE offering_midterms SET status='OPEN', locked_at=NULL, locked_by_teacher_id=NULL WHERE status='LOCKED';
DELIMITER $$
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
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS student_lab_results_group_lock_insert$$
CREATE TRIGGER student_lab_results_group_lock_insert BEFORE INSERT ON student_lab_results FOR EACH ROW BEGIN
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=NEW.student_subject_enrollment_id AND gm.midterm_no=(SELECT midterm_no FROM lab_assignments WHERE id=NEW.lab_assignment_id) AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS student_lab_results_group_lock_update$$
CREATE TRIGGER student_lab_results_group_lock_update BEFORE UPDATE ON student_lab_results FOR EACH ROW BEGIN
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=OLD.student_subject_enrollment_id AND gm.midterm_no=(SELECT midterm_no FROM lab_assignments WHERE id=OLD.lab_assignment_id) AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=NEW.student_subject_enrollment_id AND gm.midterm_no=(SELECT midterm_no FROM lab_assignments WHERE id=NEW.lab_assignment_id) AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS student_lab_results_group_lock_delete$$
CREATE TRIGGER student_lab_results_group_lock_delete BEFORE DELETE ON student_lab_results FOR EACH ROW BEGIN
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=OLD.student_subject_enrollment_id AND gm.midterm_no=(SELECT midterm_no FROM lab_assignments WHERE id=OLD.lab_assignment_id) AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS student_midterm_results_group_lock_insert$$
CREATE TRIGGER student_midterm_results_group_lock_insert BEFORE INSERT ON student_midterm_results FOR EACH ROW BEGIN
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=NEW.student_subject_enrollment_id AND gm.midterm_no=NEW.midterm_no AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS student_midterm_results_group_lock_update$$
CREATE TRIGGER student_midterm_results_group_lock_update BEFORE UPDATE ON student_midterm_results FOR EACH ROW BEGIN
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=OLD.student_subject_enrollment_id AND gm.midterm_no=OLD.midterm_no AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=NEW.student_subject_enrollment_id AND gm.midterm_no=NEW.midterm_no AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS student_midterm_results_group_lock_delete$$
CREATE TRIGGER student_midterm_results_group_lock_delete BEFORE DELETE ON student_midterm_results FOR EACH ROW BEGIN
IF EXISTS(SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=OLD.student_subject_enrollment_id AND gm.midterm_no=OLD.midterm_no AND gm.is_locked=TRUE) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unlock this lab group before changing its scores.'; END IF;
END$$
DELIMITER ;
