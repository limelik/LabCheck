import { ApiError } from "../http.js";
export async function groupMidterms(c, offeringId, teacherId) {
  const [rows] = await c.execute(
    `SELECT tsa.lab_group_id AS id, lg.code, om.midterm_no AS midtermNo,
 (om.status='LOCKED' OR COALESCE(gm.is_locked,0)) AS locked,
 om.status='LOCKED' AS legacyLocked,
 EXISTS(SELECT 1 FROM teacher_midterm_starts ts WHERE ts.offering_id=tsa.subject_group_offering_id AND ts.teacher_id=tsa.teacher_id) AS started
 FROM teacher_subject_assignments tsa JOIN lab_groups lg ON lg.id=tsa.lab_group_id
 JOIN offering_midterms om ON om.subject_group_offering_id=tsa.subject_group_offering_id
 LEFT JOIN lab_group_midterms gm ON gm.offering_id=tsa.subject_group_offering_id AND gm.lab_group_id=tsa.lab_group_id AND gm.midterm_no=om.midterm_no
 WHERE tsa.subject_group_offering_id=? AND tsa.teacher_id=?`,
    [offeringId, teacherId],
  );
  return rows;
}
export async function requireGroupOpen(c, enrollmentId, midtermNo) {
  const [rows] = await c.execute(
    `SELECT 1 FROM student_subject_enrollments e JOIN lab_group_midterms gm ON gm.offering_id=e.subject_group_offering_id AND gm.lab_group_id=e.lab_group_id WHERE e.id=? AND gm.midterm_no=? AND gm.is_locked=TRUE`,
    [enrollmentId, midtermNo],
  );
  if (rows.length)
    throw new ApiError(
      409,
      "MIDTERM_LOCKED",
      "Unlock this lab group before changing its scores.",
    );
}

export async function requireLabsEditable(c, offeringId, midtermNo) {
  const [rows] = await c.execute(
    "SELECT 1 FROM lab_group_midterms WHERE offering_id=? AND midterm_no=? AND is_locked=TRUE LIMIT 1",
    [offeringId, midtermNo],
  );
  if (rows.length)
    throw new ApiError(
      409,
      "GROUP_LOCKED",
      "Unlock the lab groups before changing shared assignments.",
    );
}
