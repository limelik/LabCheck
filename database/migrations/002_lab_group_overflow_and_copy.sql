-- Allow one overflow seat per lab group; retain all other enrollment and assessment rules.
DELIMITER $$

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
        AND lab_group_id = NEW.lab_group_id) >= 17 THEN
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
         AND lab_group_id = NEW.lab_group_id AND id <> OLD.id) >= 17 THEN
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
      SET MESSAGE_TEXT = 'Lab max grades cannot exceed the subject total grade.';
  END IF;
END$$

DELIMITER ;
