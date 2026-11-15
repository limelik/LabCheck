import { ApiError } from "../http.js";

export const MAX_STUDENTS_PER_LAB = 17;

export function neededLabGroups(studentCount) {
  return Math.ceil(studentCount / MAX_STUDENTS_PER_LAB);
}

export function placeStudents(students, labGroups) {
  if (students.length && !labGroups.length) {
    throw new ApiError(
      409,
      "NO_LAB_GROUP",
      "No lab group is available for placement.",
    );
  }
  if (students.length > labGroups.length * MAX_STUDENTS_PER_LAB)
    throw new ApiError(
      409,
      "LAB_GROUP_FULL",
      "Configured lab groups cannot hold the cohort.",
    );
  const sorted = [...students].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName, "en") ||
      a.firstName.localeCompare(b.firstName, "en") ||
      a.id - b.id,
  );
  return sorted.map((student, index) => ({
    studentId: student.id,
    labGroupId: labGroups[index % labGroups.length].id,
  }));
}

export async function ensureLabGroups(connection, group, needed) {
  const [existing] = await connection.execute(
    "SELECT id, code FROM lab_groups WHERE academic_group_id = ? ORDER BY id FOR UPDATE",
    [group.id],
  );
  const available = [...existing];
  let suffix = 1;
  while (available.length < needed) {
    const code = `${group.code.replace(/^TT/, "")}-${suffix++}`;
    if (available.some((lab) => lab.code === code)) continue;
    const [result] = await connection.execute(
      "INSERT INTO lab_groups (academic_group_id, code) VALUES (?, ?)",
      [group.id, code],
    );
    available.push({ id: result.insertId, code });
  }
  return available.slice(0, needed);
}

// Reconcile the whole trusted cohort, never signup order. Existing placements, including
// approved exceptions, remain unchanged. Missing/locked configuration requires review.
export async function reconcilePlacement(connection, groupId) {
  const [groups] = await connection.execute(
    "SELECT id, code FROM academic_groups WHERE id = ? FOR UPDATE",
    [groupId],
  );
  if (!groups.length)
    throw new ApiError(409, "PLACEMENT_CONFIG", "Academic group is missing.");
  const [students] = await connection.execute(
    "SELECT id, first_name AS firstName, last_name AS lastName FROM students WHERE academic_group_id = ? ORDER BY id FOR UPDATE",
    [groupId],
  );
  const [labs] = await connection.execute(
    "SELECT id FROM lab_groups WHERE academic_group_id = ? ORDER BY id FOR UPDATE",
    [groupId],
  );
  const needed = neededLabGroups(students.length);
  if (labs.length < needed)
    throw new ApiError(
      409,
      "PLACEMENT_CONFIG",
      `Group ${groups[0].code} needs ${needed} configured lab groups (up to ${MAX_STUDENTS_PER_LAB} students each).`,
    );
  const [offerings] = await connection.execute(
    "SELECT id FROM subject_group_offerings WHERE academic_group_id = ? AND is_active = TRUE ORDER BY id FOR UPDATE",
    [groupId],
  );
  if (!offerings.length)
    throw new ApiError(
      409,
      "PLACEMENT_CONFIG",
      `Group ${groups[0].code} has no active teaching offerings.`,
    );
  const placements = placeStudents(students, labs.slice(0, needed));
  for (const offering of offerings) {
    const [enrolled] = await connection.execute(
      "SELECT student_id AS studentId, lab_group_id AS labGroupId FROM student_subject_enrollments WHERE subject_group_offering_id = ? FOR UPDATE",
      [offering.id],
    );
    const missing = placements.filter(
      (p) => !enrolled.some((e) => e.studentId === p.studentId),
    );
    if (!missing.length) continue;
    const [midterms] = await connection.execute(
      "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? FOR UPDATE",
      [offering.id],
    );
    if (midterms.length !== 2 || midterms.some((m) => m.status === "LOCKED"))
      throw new ApiError(
        409,
        "PLACEMENT_CONFIG",
        `Offering ${offering.id} has missing or locked midterms; late enrollment requires institutional review.`,
      );
    for (const placement of missing) {
      if (
        enrolled.filter((e) => e.labGroupId === placement.labGroupId).length >=
        MAX_STUDENTS_PER_LAB
      )
        throw new ApiError(
          409,
          "PLACEMENT_CONFIG",
          `Offering ${offering.id}: deterministic target subgroup is full. Review existing exceptions.`,
        );
      await connection.execute(
        "INSERT INTO student_subject_enrollments (student_id, subject_group_offering_id, lab_group_id, default_lab_group_id) VALUES (?, ?, ?, ?)",
        [
          placement.studentId,
          offering.id,
          placement.labGroupId,
          placement.labGroupId,
        ],
      );
      enrolled.push(placement);
    }
  }
  return { offerings: offerings.length, students: students.length };
}
