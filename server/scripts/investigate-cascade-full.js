import assert from 'node:assert/strict';
import { query, pool } from '../db.js';
assert.equal(process.env.LABCHECK_ISOLATED_TEST, '1');
try {
  console.log(
    await query(
      "SHOW VARIABLES WHERE Variable_name IN ('version','foreign_key_checks','innodb_native_foreign_keys','enable_cascade_triggers')",
    ),
  );
  for (const mode of [
    'baseline',
    'no_delete_triggers',
    'no_triggers',
    'direct_offering_fk',
  ]) {
    if (mode === 'no_delete_triggers')
      for (const name of [
        'offering_midterms_validate_before_delete',
        'lab_assignments_validate_before_delete',
      ])
        await pool.query(`DROP TRIGGER IF EXISTS ${name}`);
    if (mode === 'no_triggers') {
      const triggers = await query(
        'SELECT TRIGGER_NAME AS name FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()',
      );
      for (const row of triggers) await pool.query(`DROP TRIGGER ${row.name}`);
    }
    if (mode === 'direct_offering_fk')
      await query(
        'ALTER TABLE lab_assignments ADD CONSTRAINT experiment_direct_offering_fk FOREIGN KEY(subject_group_offering_id) REFERENCES subject_group_offerings(id) ON DELETE CASCADE',
      );
    const offering = await query(
      "INSERT INTO subject_group_offerings(subject_id,academic_group_id,academic_year,semester) VALUES (8,1,?,'Fall')",
      [mode],
    );
    const id = offering.insertId;
    await query(
      'INSERT INTO offering_midterms(subject_group_offering_id,midterm_no) VALUES (?,1),(?,2)',
      [id, id],
    );
    await query(
      'INSERT INTO teacher_subject_assignments(teacher_id,subject_group_offering_id,lab_group_id) VALUES (1,?,1)',
      [id],
    );
    for (const [i, difficulty] of [5, 5, 5, 1].entries())
      await query(
        "INSERT INTO lab_assignments(subject_group_offering_id,midterm_no,lab_number,title,max_grade) VALUES (?,1,?,'Fixture',?)",
        [id, i + 1, difficulty],
      );
    await query(
      "UPDATE offering_midterms SET status='LOCKED',locked_at=UTC_TIMESTAMP(),locked_by_teacher_id=1 WHERE subject_group_offering_id=? AND midterm_no=1",
      [id],
    );
    await query(
      "INSERT INTO lab_assignments(subject_group_offering_id,midterm_no,lab_number,title,max_grade) VALUES (?,2,5,'Fixture',1)",
      [id],
    );
    await query('DELETE FROM subject_group_offerings WHERE id=?', [id]);
    console.log({
      mode,
      remaining: await query(
        'SELECT id,midterm_no FROM lab_assignments WHERE subject_group_offering_id=?',
        [id],
      ),
    });
    await query(
      'DELETE FROM lab_assignments WHERE subject_group_offering_id=?',
      [id],
    );
  }
} finally {
  await pool.end();
}
