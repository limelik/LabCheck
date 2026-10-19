import test from 'node:test';
import assert from 'node:assert/strict';

test('offering deletion cascades through both midterms', { skip: process.env.RUN_DB_TESTS !== '1' }, async (t) => {
  const { query, pool } = await import('../db.js');
  t.after(() => pool.end());
  let offeringId;
  try {
    const offering = await query('INSERT INTO subject_group_offerings (subject_id, academic_group_id, academic_year, semester) VALUES (?, ?, ?, ?)',
      [8, 1, '2095-2096', 'Fall']);
    offeringId = offering.insertId;
    await query('INSERT INTO offering_midterms (subject_group_offering_id, midterm_no) VALUES (?, ?), (?, ?)', [offeringId, 1, offeringId, 2]);
    await query('INSERT INTO teacher_subject_assignments (teacher_id, subject_group_offering_id, lab_group_id) VALUES (?, ?, ?)', [1, offeringId, 1]);
    for (const [index, grade] of [5, 5, 5, 1].entries()) {
      await query('INSERT INTO lab_assignments (subject_group_offering_id, midterm_no, lab_number, title, max_grade) VALUES (?, ?, ?, ?, ?)',
        [offeringId, 1, index + 1, 'Cascade integrity fixture', grade]);
    }
    // No students are enrolled in this disposable offering, so completeness is satisfied.
    await query('UPDATE offering_midterms SET status = ?, locked_at = UTC_TIMESTAMP(), locked_by_teacher_id = ? WHERE subject_group_offering_id = ? AND midterm_no = ?',
      ['LOCKED', 1, offeringId, 1]);
    await query('INSERT INTO lab_assignments (subject_group_offering_id, midterm_no, lab_number, title, max_grade) VALUES (?, ?, ?, ?, ?)',
      [offeringId, 2, 5, 'Second-midterm cascade fixture', 1]);
    await query('DELETE FROM subject_group_offerings WHERE id = ?', [offeringId]);
    const remaining = await query('SELECT id, midterm_no AS midtermNo FROM lab_assignments WHERE subject_group_offering_id = ?', [offeringId]);
    assert.deepEqual(remaining, [], 'Nested ON DELETE CASCADE must not leave lab rows without their midterm parent.');
  } finally {
    if (offeringId) {
      await query('DELETE FROM subject_group_offerings WHERE id = ?', [offeringId]);
      // Remove any orphaned fixture rows even when the server fails the cascade assertion.
      await query('DELETE FROM lab_assignments WHERE subject_group_offering_id = ?', [offeringId]);
    }
  }
});
