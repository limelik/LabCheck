import { ApiError } from '../http.js';

export function neededLabGroups(studentCount) {
  return Math.ceil(studentCount / 16);
}

export function placeStudents(students, labGroups) {
  if (students.length && !labGroups.length) {
    throw new ApiError(409, 'NO_LAB_GROUP', 'No lab group is available for placement.');
  }
  const sorted = [...students].sort((a, b) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.id - b.id);
  return sorted.map((student, index) => ({ studentId: student.id, labGroupId: labGroups[index % labGroups.length].id }));
}

export async function ensureLabGroups(connection, group, needed) {
  const [existing] = await connection.execute('SELECT id, code FROM lab_groups WHERE academic_group_id = ? ORDER BY id FOR UPDATE', [group.id]);
  const available = [...existing];
  let suffix = 1;
  while (available.length < needed) {
    const code = `${group.code.replace(/^TT/, '')}-${suffix++}`;
    if (available.some((lab) => lab.code === code)) continue;
    const [result] = await connection.execute('INSERT INTO lab_groups (academic_group_id, code) VALUES (?, ?)', [group.id, code]);
    available.push({ id: result.insertId, code });
  }
  return available.slice(0, needed);
}
