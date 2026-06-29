BEGIN;

CREATE TYPE account_type AS ENUM (
  'ADMIN',
  'TEACHER',
  'STUDENT'
);

CREATE TYPE admin_level AS ENUM (
  'SUPER_ADMIN',
  'ACADEMIC_UNIT_ADMIN'
);

CREATE TYPE academic_unit_type AS ENUM (
  'INSTITUTE',
  'FACULTY'
);

CREATE TYPE approval_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE semester_name AS ENUM (
  'Fall',
  'Spring',
  'Summer'
);

CREATE TYPE attendance_status AS ENUM (
  'PRESENT',
  'ABSENT',
  'EXCUSED',
  'UNMARKED'
);

CREATE TYPE activity_status AS ENUM (
  'SUCCESS',
  'FAILED'
);

CREATE TABLE user_accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  account_type account_type NOT NULL,
  approval_status approval_status NOT NULL DEFAULT 'PENDING',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  reviewed_by_user_account_id BIGINT REFERENCES user_accounts(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approval_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_accounts_email_domain_chk
    CHECK (lower(email) LIKE '%@polytechnic.am')
);

CREATE UNIQUE INDEX user_accounts_email_lower_ux
  ON user_accounts (lower(email));

CREATE INDEX user_accounts_approval_status_idx
  ON user_accounts (approval_status);

CREATE TABLE academic_units (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_type academic_unit_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_units_code_ux UNIQUE (code),
  CONSTRAINT academic_units_name_ux UNIQUE (name)
);

CREATE TABLE specializations (
  id BIGSERIAL PRIMARY KEY,
  academic_unit_id BIGINT NOT NULL REFERENCES academic_units(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT specializations_unit_code_ux UNIQUE (academic_unit_id, code),
  CONSTRAINT specializations_unit_name_ux UNIQUE (academic_unit_id, name)
);

CREATE TABLE academic_groups (
  id BIGSERIAL PRIMARY KEY,
  specialization_id BIGINT NOT NULL REFERENCES specializations(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_groups_code_ux UNIQUE (code),
  CONSTRAINT academic_groups_start_year_chk CHECK (start_year >= 2000)
);

CREATE TABLE lab_groups (
  id BIGSERIAL PRIMARY KEY,
  academic_group_id BIGINT NOT NULL REFERENCES academic_groups(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  lab_group_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lab_groups_number_chk CHECK (lab_group_number > 0),
  CONSTRAINT lab_groups_code_ux UNIQUE (code),
  CONSTRAINT lab_groups_group_number_ux UNIQUE (academic_group_id, lab_group_number)
);

CREATE TABLE subjects (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subjects_code_ux UNIQUE (code)
);

CREATE TABLE admins (
  id BIGSERIAL PRIMARY KEY,
  user_account_id BIGINT NOT NULL UNIQUE REFERENCES user_accounts(id) ON DELETE CASCADE,
  academic_unit_id BIGINT UNIQUE REFERENCES academic_units(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  admin_level admin_level NOT NULL,
  employee_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admins_employee_number_ux UNIQUE (employee_number),
  CONSTRAINT admins_scope_chk CHECK (
    (admin_level = 'SUPER_ADMIN' AND academic_unit_id IS NULL) OR
    (admin_level = 'ACADEMIC_UNIT_ADMIN' AND academic_unit_id IS NOT NULL)
  )
);

CREATE TABLE teachers (
  id BIGSERIAL PRIMARY KEY,
  user_account_id BIGINT NOT NULL UNIQUE REFERENCES user_accounts(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  employee_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
  id BIGSERIAL PRIMARY KEY,
  user_account_id BIGINT NOT NULL UNIQUE REFERENCES user_accounts(id) ON DELETE CASCADE,
  academic_group_id BIGINT NOT NULL REFERENCES academic_groups(id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  student_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subject_group_offerings (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_group_id BIGINT NOT NULL REFERENCES academic_groups(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  semester semester_name NOT NULL,
  max_absences_before_block INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subject_group_offerings_ux
    UNIQUE (subject_id, academic_group_id, academic_year, semester),
  CONSTRAINT subject_group_offerings_absence_limit_chk
    CHECK (max_absences_before_block >= 0)
);

CREATE TABLE teacher_subject_assignments (
  id BIGSERIAL PRIMARY KEY,
  teacher_id BIGINT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_group_offering_id BIGINT NOT NULL REFERENCES subject_group_offerings(id) ON DELETE CASCADE,
  lab_group_id BIGINT NOT NULL REFERENCES lab_groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teacher_subject_assignments_ux
    UNIQUE (teacher_id, subject_group_offering_id, lab_group_id)
);

CREATE TABLE student_subject_enrollments (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_group_offering_id BIGINT NOT NULL REFERENCES subject_group_offerings(id) ON DELETE CASCADE,
  lab_group_id BIGINT NOT NULL REFERENCES lab_groups(id) ON DELETE RESTRICT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_subject_enrollments_ux UNIQUE (student_id, subject_group_offering_id)
);

CREATE TABLE lab_change_requests (
  id BIGSERIAL PRIMARY KEY,
  student_subject_enrollment_id BIGINT NOT NULL REFERENCES student_subject_enrollments(id) ON DELETE CASCADE,
  current_lab_group_id BIGINT NOT NULL REFERENCES lab_groups(id) ON DELETE RESTRICT,
  requested_lab_group_id BIGINT NOT NULL REFERENCES lab_groups(id) ON DELETE RESTRICT,
  status approval_status NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by_teacher_id BIGINT REFERENCES teachers(id) ON DELETE SET NULL,
  CONSTRAINT lab_change_requests_group_diff_chk CHECK (current_lab_group_id <> requested_lab_group_id),
  CONSTRAINT lab_change_requests_decision_chk CHECK (
    (status = 'PENDING' AND decided_at IS NULL AND decided_by_teacher_id IS NULL) OR
    (status IN ('APPROVED', 'REJECTED') AND decided_at IS NOT NULL AND decided_by_teacher_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX lab_change_requests_one_pending_ux
  ON lab_change_requests (student_subject_enrollment_id)
  WHERE status = 'PENDING';

CREATE TABLE lab_assignments (
  id BIGSERIAL PRIMARY KEY,
  subject_group_offering_id BIGINT NOT NULL REFERENCES subject_group_offerings(id) ON DELETE CASCADE,
  midterm_no INTEGER NOT NULL,
  lab_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  max_points NUMERIC(4, 2) NOT NULL,
  difficulty INTEGER NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lab_assignments_offering_midterm_number_ux
    UNIQUE (subject_group_offering_id, midterm_no, lab_number),
  CONSTRAINT lab_assignments_midterm_no_chk CHECK (midterm_no BETWEEN 1 AND 2),
  CONSTRAINT lab_assignments_lab_number_chk CHECK (lab_number > 0),
  CONSTRAINT lab_assignments_max_points_chk CHECK (max_points > 0 AND max_points <= 16),
  CONSTRAINT lab_assignments_difficulty_chk CHECK (difficulty BETWEEN 1 AND 5)
);

CREATE TABLE lab_assignment_lab_groups (
  lab_assignment_id BIGINT NOT NULL REFERENCES lab_assignments(id) ON DELETE CASCADE,
  lab_group_id BIGINT NOT NULL REFERENCES lab_groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lab_assignment_id, lab_group_id)
);

CREATE TABLE student_lab_results (
  id BIGSERIAL PRIMARY KEY,
  lab_assignment_id BIGINT NOT NULL REFERENCES lab_assignments(id) ON DELETE CASCADE,
  student_subject_enrollment_id BIGINT NOT NULL REFERENCES student_subject_enrollments(id) ON DELETE CASCADE,
  attendance attendance_status NOT NULL DEFAULT 'UNMARKED',
  grade NUMERIC(4, 2),
  teacher_comment TEXT NOT NULL DEFAULT '',
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_lab_results_grade_chk CHECK (grade IS NULL OR grade >= 0),
  CONSTRAINT student_lab_results_ux UNIQUE (lab_assignment_id, student_subject_enrollment_id)
);

CREATE TABLE student_midterm_results (
  id BIGSERIAL PRIMARY KEY,
  student_subject_enrollment_id BIGINT NOT NULL REFERENCES student_subject_enrollments(id) ON DELETE CASCADE,
  midterm_no INTEGER NOT NULL,
  exam_score NUMERIC(4, 2) NOT NULL,
  teacher_comment TEXT NOT NULL DEFAULT '',
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_midterm_results_ux UNIQUE (student_subject_enrollment_id, midterm_no),
  CONSTRAINT student_midterm_results_midterm_no_chk CHECK (midterm_no BETWEEN 1 AND 2),
  CONSTRAINT student_midterm_results_exam_score_chk CHECK (exam_score >= 0 AND exam_score <= 4)
);

CREATE OR REPLACE FUNCTION validate_offering_lab_group_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM subject_group_offerings sgo
    JOIN lab_groups lg ON lg.id = NEW.lab_group_id
    WHERE sgo.id = NEW.subject_group_offering_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    RAISE EXCEPTION
      'lab_group_id % does not belong to the academic group of subject_group_offering_id %',
      NEW.lab_group_id,
      NEW.subject_group_offering_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_subject_assignments_validate_trg
  BEFORE INSERT OR UPDATE ON teacher_subject_assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_offering_lab_group_match();

CREATE OR REPLACE FUNCTION validate_student_offering_group_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM students s
    JOIN subject_group_offerings sgo
      ON sgo.id = NEW.subject_group_offering_id
    WHERE s.id = NEW.student_id
      AND s.academic_group_id = sgo.academic_group_id
  ) THEN
    RAISE EXCEPTION
      'student_id % does not belong to subject_group_offering_id % academic group',
      NEW.student_id,
      NEW.subject_group_offering_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_subject_enrollments_validate_trg
  BEFORE INSERT OR UPDATE ON student_subject_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION validate_offering_lab_group_match();

CREATE TRIGGER student_subject_enrollments_student_group_validate_trg
  BEFORE INSERT OR UPDATE ON student_subject_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_offering_group_match();

CREATE OR REPLACE FUNCTION validate_lab_change_request()
RETURNS TRIGGER AS $$
DECLARE
  v_offering_id BIGINT;
  v_academic_group_id BIGINT;
  v_current_lab_group_id BIGINT;
BEGIN
  SELECT
    sse.subject_group_offering_id,
    sgo.academic_group_id,
    sse.lab_group_id
  INTO
    v_offering_id,
    v_academic_group_id,
    v_current_lab_group_id
  FROM student_subject_enrollments sse
  JOIN subject_group_offerings sgo
    ON sgo.id = sse.subject_group_offering_id
  WHERE sse.id = NEW.student_subject_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'student_subject_enrollment_id % does not exist',
      NEW.student_subject_enrollment_id;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.current_lab_group_id <> v_current_lab_group_id THEN
    RAISE EXCEPTION
      'current_lab_group_id % does not match enrollment lab_group_id %',
      NEW.current_lab_group_id,
      v_current_lab_group_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lab_groups lg
    WHERE lg.id = NEW.current_lab_group_id
      AND lg.academic_group_id = v_academic_group_id
  ) THEN
    RAISE EXCEPTION
      'current_lab_group_id % does not belong to offering academic group',
      NEW.current_lab_group_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lab_groups lg
    WHERE lg.id = NEW.requested_lab_group_id
      AND lg.academic_group_id = v_academic_group_id
  ) THEN
    RAISE EXCEPTION
      'requested_lab_group_id % does not belong to offering academic group',
      NEW.requested_lab_group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lab_change_requests_validate_trg
  BEFORE INSERT OR UPDATE ON lab_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_lab_change_request();

CREATE OR REPLACE FUNCTION auto_assign_lab_groups_for_offering(p_subject_group_offering_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_academic_group_id BIGINT;
  v_lab_group_ids BIGINT[];
  v_lab_group_count INTEGER;
BEGIN
  SELECT sgo.academic_group_id
  INTO v_academic_group_id
  FROM subject_group_offerings sgo
  WHERE sgo.id = p_subject_group_offering_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'subject_group_offering_id % does not exist',
      p_subject_group_offering_id;
  END IF;

  SELECT ARRAY_AGG(lg.id ORDER BY lg.lab_group_number)
  INTO v_lab_group_ids
  FROM lab_groups lg
  WHERE lg.academic_group_id = v_academic_group_id;

  v_lab_group_count := COALESCE(array_length(v_lab_group_ids, 1), 0);

  IF v_lab_group_count = 0 THEN
    RAISE EXCEPTION
      'no lab groups found for academic_group_id %',
      v_academic_group_id;
  END IF;

  INSERT INTO student_subject_enrollments (
    student_id,
    subject_group_offering_id,
    lab_group_id,
    enrolled_at
  )
  SELECT
    s.id,
    p_subject_group_offering_id,
    v_lab_group_ids[((ROW_NUMBER() OVER (ORDER BY s.last_name, s.first_name, s.id) - 1) % v_lab_group_count) + 1],
    NOW()
  FROM students s
  WHERE s.academic_group_id = v_academic_group_id
  ORDER BY s.last_name, s.first_name, s.id
  ON CONFLICT (student_id, subject_group_offering_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_assign_lab_groups_for_offering_trg()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM auto_assign_lab_groups_for_offering(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subject_group_offerings_auto_assign_trg
  AFTER INSERT ON subject_group_offerings
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_lab_groups_for_offering_trg();

CREATE OR REPLACE FUNCTION create_lab_change_request(
  p_student_subject_enrollment_id BIGINT,
  p_requested_lab_group_id BIGINT
)
RETURNS BIGINT AS $$
DECLARE
  v_current_lab_group_id BIGINT;
  v_request_id BIGINT;
BEGIN
  SELECT sse.lab_group_id
  INTO v_current_lab_group_id
  FROM student_subject_enrollments sse
  WHERE sse.id = p_student_subject_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'student_subject_enrollment_id % does not exist',
      p_student_subject_enrollment_id;
  END IF;

  INSERT INTO lab_change_requests (
    student_subject_enrollment_id,
    current_lab_group_id,
    requested_lab_group_id,
    status
  )
  VALUES (
    p_student_subject_enrollment_id,
    v_current_lab_group_id,
    p_requested_lab_group_id,
    'PENDING'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION approve_lab_change_request(
  p_request_id BIGINT,
  p_teacher_id BIGINT
)
RETURNS VOID AS $$
DECLARE
  v_enrollment_id BIGINT;
  v_subject_group_offering_id BIGINT;
  v_requested_lab_group_id BIGINT;
BEGIN
  SELECT
    lcr.student_subject_enrollment_id,
    sse.subject_group_offering_id,
    lcr.requested_lab_group_id
  INTO
    v_enrollment_id,
    v_subject_group_offering_id,
    v_requested_lab_group_id
  FROM lab_change_requests lcr
  JOIN student_subject_enrollments sse
    ON sse.id = lcr.student_subject_enrollment_id
  WHERE lcr.id = p_request_id
    AND lcr.status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'pending lab_change_request_id % does not exist',
      p_request_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM teacher_subject_assignments tsa
    WHERE tsa.teacher_id = p_teacher_id
      AND tsa.subject_group_offering_id = v_subject_group_offering_id
  ) THEN
    RAISE EXCEPTION
      'teacher_id % is not assigned to subject_group_offering_id %',
      p_teacher_id,
      v_subject_group_offering_id;
  END IF;

  UPDATE student_subject_enrollments
  SET lab_group_id = v_requested_lab_group_id
  WHERE id = v_enrollment_id;

  UPDATE lab_change_requests
  SET status = 'APPROVED',
      decided_at = NOW(),
      decided_by_teacher_id = p_teacher_id
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_lab_change_request(
  p_request_id BIGINT,
  p_teacher_id BIGINT
)
RETURNS VOID AS $$
DECLARE
  v_subject_group_offering_id BIGINT;
BEGIN
  SELECT sse.subject_group_offering_id
  INTO v_subject_group_offering_id
  FROM lab_change_requests lcr
  JOIN student_subject_enrollments sse
    ON sse.id = lcr.student_subject_enrollment_id
  WHERE lcr.id = p_request_id
    AND lcr.status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'pending lab_change_request_id % does not exist',
      p_request_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM teacher_subject_assignments tsa
    WHERE tsa.teacher_id = p_teacher_id
      AND tsa.subject_group_offering_id = v_subject_group_offering_id
  ) THEN
    RAISE EXCEPTION
      'teacher_id % is not assigned to subject_group_offering_id %',
      p_teacher_id,
      v_subject_group_offering_id;
  END IF;

  UPDATE lab_change_requests
  SET status = 'REJECTED',
      decided_at = NOW(),
      decided_by_teacher_id = p_teacher_id
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_lab_assignment_midterm_total()
RETURNS TRIGGER AS $$
DECLARE
  v_midterm_total NUMERIC(6, 2);
BEGIN
  SELECT COALESCE(SUM(la.max_points), 0)
  INTO v_midterm_total
  FROM lab_assignments la
  WHERE la.subject_group_offering_id = NEW.subject_group_offering_id
    AND la.midterm_no = NEW.midterm_no
    AND la.id <> COALESCE(NEW.id, -1);

  IF v_midterm_total + NEW.max_points > 16 THEN
    RAISE EXCEPTION
      'the total lab points for one offering midterm cannot exceed 16';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lab_assignments_validate_trg
  BEFORE INSERT OR UPDATE ON lab_assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_lab_assignment_midterm_total();

CREATE OR REPLACE FUNCTION validate_lab_assignment_lab_group()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM lab_assignments la
    JOIN subject_group_offerings sgo ON sgo.id = la.subject_group_offering_id
    JOIN lab_groups lg ON lg.id = NEW.lab_group_id
    WHERE la.id = NEW.lab_assignment_id
      AND lg.academic_group_id = sgo.academic_group_id
  ) THEN
    RAISE EXCEPTION
      'lab_group_id % does not belong to the academic group of lab_assignment_id %',
      NEW.lab_group_id,
      NEW.lab_assignment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lab_assignment_lab_groups_validate_trg
  BEFORE INSERT OR UPDATE ON lab_assignment_lab_groups
  FOR EACH ROW
  EXECUTE FUNCTION validate_lab_assignment_lab_group();

CREATE OR REPLACE FUNCTION validate_student_lab_result()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_group_offering_id BIGINT;
  v_lab_group_id BIGINT;
  v_lab_max_points NUMERIC(4, 2);
BEGIN
  SELECT
    sse.subject_group_offering_id,
    sse.lab_group_id
  INTO
    v_subject_group_offering_id,
    v_lab_group_id
  FROM student_subject_enrollments sse
  WHERE sse.id = NEW.student_subject_enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'student_subject_enrollment_id % does not exist',
      NEW.student_subject_enrollment_id;
  END IF;

  SELECT la.max_points
  INTO v_lab_max_points
  FROM lab_assignments la
  WHERE la.id = NEW.lab_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'lab_assignment_id % does not exist',
      NEW.lab_assignment_id;
  END IF;

  IF NEW.grade IS NOT NULL AND NEW.grade > v_lab_max_points THEN
    RAISE EXCEPTION
      'grade % exceeds the max points % for lab_assignment_id %',
      NEW.grade,
      v_lab_max_points,
      NEW.lab_assignment_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lab_assignments la
    JOIN lab_assignment_lab_groups lalg
      ON lalg.lab_assignment_id = la.id
     AND lalg.lab_group_id = v_lab_group_id
    WHERE la.id = NEW.lab_assignment_id
      AND la.subject_group_offering_id = v_subject_group_offering_id
  ) THEN
    RAISE EXCEPTION
      'lab_assignment_id % is not visible to student_subject_enrollment_id %',
      NEW.lab_assignment_id,
      NEW.student_subject_enrollment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_lab_results_validate_trg
  BEFORE INSERT OR UPDATE ON student_lab_results
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_lab_result();

CREATE TABLE password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_account_id BIGINT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT password_reset_tokens_token_hash_ux UNIQUE (token_hash),
  CONSTRAINT password_reset_tokens_expiry_chk CHECK (expires_at > created_at)
);

CREATE INDEX password_reset_tokens_user_account_idx
  ON password_reset_tokens (user_account_id, expires_at);

CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_account_id BIGINT REFERENCES user_accounts(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status activity_status NOT NULL DEFAULT 'SUCCESS',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_logs_actor_created_at_idx
  ON activity_logs (actor_user_account_id, created_at DESC);

CREATE INDEX activity_logs_entity_idx
  ON activity_logs (entity_type, entity_id);

CREATE VIEW student_subject_progress AS
SELECT
  sse.id AS student_subject_enrollment_id,
  sse.student_id,
  sse.subject_group_offering_id,
  COALESCE(labs.absence_count, 0) AS absence_count,
  COALESCE(labs.midterm_1_lab_score, 0) AS midterm_1_lab_score,
  COALESCE(exams.midterm_1_exam_score, 0) AS midterm_1_exam_score,
  COALESCE(labs.midterm_1_lab_score, 0) + COALESCE(exams.midterm_1_exam_score, 0) AS midterm_1_total,
  COALESCE(labs.midterm_2_lab_score, 0) AS midterm_2_lab_score,
  COALESCE(exams.midterm_2_exam_score, 0) AS midterm_2_exam_score,
  COALESCE(labs.midterm_2_lab_score, 0) + COALESCE(exams.midterm_2_exam_score, 0) AS midterm_2_total,
  COALESCE(labs.midterm_1_lab_score, 0)
    + COALESCE(exams.midterm_1_exam_score, 0)
    + COALESCE(labs.midterm_2_lab_score, 0)
    + COALESCE(exams.midterm_2_exam_score, 0) AS overall_total,
  sgo.max_absences_before_block,
  (COALESCE(labs.absence_count, 0) <= sgo.max_absences_before_block) AS is_midterm_eligible
FROM student_subject_enrollments sse
JOIN subject_group_offerings sgo ON sgo.id = sse.subject_group_offering_id
LEFT JOIN (
  SELECT
    slr.student_subject_enrollment_id,
    COUNT(slr.id) FILTER (WHERE slr.attendance = 'ABSENT') AS absence_count,
    LEAST(COALESCE(SUM(CASE WHEN la.midterm_no = 1 THEN slr.grade ELSE 0 END), 0), 16) AS midterm_1_lab_score,
    LEAST(COALESCE(SUM(CASE WHEN la.midterm_no = 2 THEN slr.grade ELSE 0 END), 0), 16) AS midterm_2_lab_score
  FROM student_lab_results slr
  JOIN lab_assignments la ON la.id = slr.lab_assignment_id
  GROUP BY slr.student_subject_enrollment_id
) labs ON labs.student_subject_enrollment_id = sse.id
LEFT JOIN (
  SELECT
    smr.student_subject_enrollment_id,
    COALESCE(MAX(CASE WHEN smr.midterm_no = 1 THEN smr.exam_score END), 0) AS midterm_1_exam_score,
    COALESCE(MAX(CASE WHEN smr.midterm_no = 2 THEN smr.exam_score END), 0) AS midterm_2_exam_score
  FROM student_midterm_results smr
  GROUP BY smr.student_subject_enrollment_id
) exams ON exams.student_subject_enrollment_id = sse.id;

CREATE VIEW not_allowed_students AS
SELECT
  ssp.student_subject_enrollment_id,
  ssp.student_id,
  ssp.subject_group_offering_id,
  ssp.absence_count,
  ssp.overall_total,
  ssp.is_midterm_eligible
FROM student_subject_progress ssp
WHERE ssp.is_midterm_eligible = FALSE;

COMMIT;
