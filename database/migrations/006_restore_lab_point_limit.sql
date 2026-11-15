ALTER TABLE lab_assignments DROP CHECK lab_assignments_max_grade_chk, ADD CONSTRAINT lab_assignments_max_grade_chk CHECK (max_grade BETWEEN 1 AND 5);
