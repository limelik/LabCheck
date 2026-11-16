DROP TEMPORARY TABLE IF EXISTS demo_roster_enrollment_candidates;

CREATE TEMPORARY TABLE demo_roster_enrollment_candidates AS
SELECT student.id AS student_id, offering.id AS offering_id, lab_group.id AS lab_group_id
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

INSERT INTO student_subject_enrollments (
  student_id,
  subject_group_offering_id,
  lab_group_id,
  default_lab_group_id
)
SELECT student_id, offering_id, lab_group_id, lab_group_id
FROM demo_roster_enrollment_candidates;

DROP TEMPORARY TABLE demo_roster_enrollment_candidates;
