// Call inside a transaction. The academic-group lock serializes registrations and offerings.
export async function placeAcademicGroup(connection, academicGroupId) {
  const [[academicGroup]] = await connection.execute(
    "SELECT code FROM academic_groups WHERE id = ? FOR UPDATE", [academicGroupId]);
  const [students] = await connection.execute(
    "SELECT id FROM students WHERE academic_group_id = ? ORDER BY last_name, first_name, id FOR UPDATE",
    [academicGroupId]);
  const [groups] = await connection.execute(
    "SELECT id, code FROM lab_groups WHERE academic_group_id = ? FOR UPDATE", [academicGroupId]);
  groups.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  async function addGroup() {
    let suffix = groups.length + 1;
    let code;
    while (true) {
      code = `${academicGroup.code}-${suffix++}`;
      const [existing] = await connection.execute("SELECT id FROM lab_groups WHERE code = ?", [code]);
      if (!existing.length) break;
    }
    const [result] = await connection.execute(
      "INSERT INTO lab_groups (academic_group_id, code) VALUES (?, ?)", [academicGroupId, code]);
    const group = { id: result.insertId, code };
    groups.push(group);
    return group;
  }
  while (groups.length < Math.ceil(students.length / 16)) await addGroup();
  const [offerings] = await connection.execute(
    `SELECT id FROM subject_group_offerings o WHERE academic_group_id = ? AND is_active = TRUE
     AND NOT EXISTS (SELECT 1 FROM offering_midterms m WHERE m.subject_group_offering_id = o.id AND m.status = 'LOCKED')
     ORDER BY id FOR UPDATE`, [academicGroupId]);
  for (const offering of offerings) {
    const [enrollments] = await connection.execute(
      "SELECT id, student_id AS studentId, lab_group_id AS labGroupId FROM student_subject_enrollments WHERE subject_group_offering_id = ? FOR UPDATE",
      [offering.id]);
    const [[activity]] = await connection.execute(
      `SELECT EXISTS (SELECT 1 FROM student_subject_enrollments e WHERE e.subject_group_offering_id = ? AND (
         EXISTS (SELECT 1 FROM student_lab_results r WHERE r.student_subject_enrollment_id = e.id) OR
         EXISTS (SELECT 1 FROM student_midterm_results r WHERE r.student_subject_enrollment_id = e.id) OR
         EXISTS (SELECT 1 FROM lab_change_requests r WHERE r.student_subject_enrollment_id = e.id)
       )) OR EXISTS (SELECT 1 FROM lab_group_midterm_locks WHERE subject_group_offering_id = ?) AS started`,
      [offering.id, offering.id]);
    // Before teaching begins, rebuild the roster in contiguous surname blocks of 16.
    // Once results/requests exist, preserve those placements and fill available groups.
    if (!Number(activity.started)) {
      await connection.execute("DELETE FROM student_subject_enrollments WHERE subject_group_offering_id = ?", [offering.id]);
      enrollments.length = 0;
    }
    const [locks] = await connection.execute(
      "SELECT lab_group_id AS id FROM lab_group_midterm_locks WHERE subject_group_offering_id = ?", [offering.id]);
    const locked = new Set(locks.map((g) => g.id));
    for (let index = 0; index < students.length; index++) {
      const student = students[index];
      if (enrollments.some((e) => e.studentId === student.id)) continue;
      const preferredIndex = Math.floor(index / 16);
      const available = groups.filter((g) => !locked.has(g.id) && enrollments.filter((e) => e.labGroupId === g.id).length < 16);
      available.sort((a, b) => Math.abs(groups.indexOf(a) - preferredIndex) - Math.abs(groups.indexOf(b) - preferredIndex));
      const group = available[0] ?? await addGroup();
      await connection.execute(
        `INSERT INTO student_subject_enrollments (student_id, subject_group_offering_id, lab_group_id, default_lab_group_id)
         VALUES (?, ?, ?, ?)`, [student.id, offering.id, group.id, group.id]);
      enrollments.push({ studentId: student.id, labGroupId: group.id });
    }
  }
}
