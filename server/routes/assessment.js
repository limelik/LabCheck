import {
  groupMidterms,
  requireGroupOpen,
  requireLabsEditable,
} from "../services/group-midterms.js";
import { Router } from "express";
import { z } from "zod";
import { pool, query, transaction } from "../db.js";
import { midtermReadiness } from "../services/midterms.js";
import {
  offeringAccess,
  requireRole,
  lockTeachingOffering,
} from "../access.js";
import {
  ApiError,
  asyncRoute,
  idParam,
  midtermParam,
  requireRecord,
  validate,
} from "../http.js";

export const assessmentRouter = Router();
const labInput = z.strictObject({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().nullable().optional(),
  difficulty: z.number().int().min(1).max(5),
});
const resultInput = z.strictObject({
  grade: z.number().int().min(0).max(5).nullable(),
  attendance: z.enum(["PRESENT", "ABSENT", "EXCUSED", "UNMARKED"]),
});

async function teacherOwnsEnrollment(
  connection,
  teacherId,
  enrollmentId,
  offeringId,
) {
  const [rows] = await connection.execute(
    `SELECT sse.id FROM student_subject_enrollments sse
    JOIN teacher_subject_assignments tsa ON tsa.subject_group_offering_id = sse.subject_group_offering_id
      AND tsa.lab_group_id = sse.lab_group_id
    WHERE sse.id = ? AND sse.subject_group_offering_id = ? AND tsa.teacher_id = ? LIMIT 1`,
    [enrollmentId, offeringId, teacherId],
  );
  if (!rows.length)
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Student is outside your assigned lab group.",
    );
}

assessmentRouter.get(
  "/offerings/:id/midterms",
  asyncRoute(async (req, res) => {
    const offeringId = idParam(req.params.id);
    await offeringAccess(req.user, offeringId);
    const [midterms, labs, readiness] = await Promise.all([
      query(
        `SELECT midterm_no AS midtermNo, status, locked_at AS lockedAt,
      locked_by_teacher_id AS lockedByTeacherId FROM offering_midterms
      WHERE subject_group_offering_id = ? ORDER BY midterm_no`,
        [offeringId],
      ),
      query(
        `SELECT id, subject_group_offering_id AS offeringId, midterm_no AS midtermNo,
      lab_number AS labNumber, title, description, max_grade AS difficulty
      FROM lab_assignments WHERE subject_group_offering_id = ? ORDER BY lab_number`,
        [offeringId],
      ),
      req.user.role === "student"
        ? Promise.resolve([])
        : midtermReadiness(pool, offeringId),
    ]);
    const groups =
      req.user.role === "teacher"
        ? await groupMidterms(pool, offeringId, req.user.profileId)
        : [];
    const groupId = req.query.labGroupId ? idParam(req.query.labGroupId) : null;
    res.json(
      midterms.map((midterm) => ({
        ...midterm,
        ...readiness.find((row) => row.midtermNo === midterm.midtermNo),
        ...(req.user.role === "teacher"
          ? (() => {
              const own = groups.filter(
                (g) => g.midtermNo === midterm.midtermNo,
              );
              const selected = own.find((g) => g.id === groupId);
              const issues =
                readiness
                  .find((r) => r.midtermNo === midterm.midtermNo)
                  ?.lockIssues.filter(
                    (issue) =>
                      !issue.includes(": complete") ||
                      own.some(
                        (g) =>
                          (!groupId || g.id === groupId) &&
                          issue.startsWith(g.code + ":"),
                      ),
                  ) || [];
              const started = groups.some((g) => g.started || g.legacyLocked);
              if (started) {
                const i = issues.indexOf("Lock the first midterm first.");
                if (i >= 0) issues.splice(i, 1);
              }
              return {
                status: groupId
                  ? selected?.locked
                    ? "LOCKED"
                    : "OPEN"
                  : midterm.midtermNo === 1
                    ? started
                      ? "LOCKED"
                      : "OPEN"
                    : own.length && own.every((g) => g.locked)
                      ? "LOCKED"
                      : "OPEN",
                lockIssues: issues,
                canLock: Boolean(
                  selected &&
                  !selected.locked &&
                  !issues.length &&
                  (midterm.midtermNo === 1 || started),
                ),
                canUnlock: Boolean(
                  selected && selected.locked && !selected.legacyLocked,
                ),
                secondStarted: started,
                canStartSecond:
                  groups.some((g) => g.midtermNo === 1) &&
                  groups
                    .filter((g) => g.midtermNo === 1)
                    .every((g) => g.locked) &&
                  !started,
              };
            })()
          : {}),
        labs: labs.filter((lab) => lab.midtermNo === midterm.midtermNo),
        assignedPoints: labs
          .filter((lab) => lab.midtermNo === midterm.midtermNo)
          .reduce((sum, lab) => sum + lab.difficulty, 0),
      })),
    );
  }),
);

assessmentRouter.post(
  "/offerings/:id/midterms/:no/labs",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const offeringId = idParam(req.params.id);
    const midtermNo = midtermParam(req.params.no);
    const data = validate(labInput, req.body);
    await offeringAccess(req.user, offeringId);
    const id = await transaction(async (connection) => {
      await lockTeachingOffering(connection, req.user, offeringId);
      const [midterms] = await connection.execute(
        `SELECT status FROM offering_midterms
      WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE`,
        [offeringId, midtermNo],
      );
      if (requireRecord(midterms[0]).status !== "OPEN")
        throw new ApiError(409, "MIDTERM_LOCKED", "Midterm is locked.");
      await requireLabsEditable(connection, offeringId, midtermNo);
      if (
        midtermNo === 2 &&
        !(await groupMidterms(connection, offeringId, req.user.profileId)).some(
          (g) => g.started || g.legacyLocked,
        )
      )
        throw new ApiError(
          409,
          "NOT_STARTED",
          "Start the second midterm first.",
        );
      const [numbers] = await connection.execute(
        `SELECT COALESCE(MAX(lab_number), 0) AS maxNumber
      FROM lab_assignments WHERE subject_group_offering_id = ?`,
        [offeringId],
      );
      const [insert] = await connection.execute(
        `INSERT INTO lab_assignments
      (subject_group_offering_id, midterm_no, lab_number, title, description, max_grade)
      VALUES (?, ?, ?, ?, ?, ?)`,
        [
          offeringId,
          midtermNo,
          numbers[0].maxNumber + 1,
          data.title,
          data.description || null,
          data.difficulty,
        ],
      );
      return insert.insertId;
    });
    const rows = await query(
      `SELECT id, subject_group_offering_id AS offeringId, midterm_no AS midtermNo,
    lab_number AS labNumber, title, description, max_grade AS difficulty FROM lab_assignments WHERE id = ?`,
      [id],
    );
    res.status(201).json(rows[0]);
  }),
);

assessmentRouter.patch(
  "/labs/:id",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    const data = validate(labInput, req.body);
    const labs = await query(
      "SELECT subject_group_offering_id AS offeringId, midterm_no AS midtermNo FROM lab_assignments WHERE id = ?",
      [id],
    );
    await offeringAccess(
      req.user,
      requireRecord(labs[0], "Lab not found.").offeringId,
    );
    await transaction(async (connection) => {
      await lockTeachingOffering(connection, req.user, labs[0].offeringId);
      await requireLabsEditable(
        connection,
        labs[0].offeringId,
        labs[0].midtermNo,
      );
      await connection.execute(
        "UPDATE lab_assignments SET title = ?, description = ?, max_grade = ? WHERE id = ?",
        [data.title, data.description || null, data.difficulty, id],
      );
    });
    res.json({ id, ...data });
  }),
);

assessmentRouter.delete(
  "/labs/:id",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    const labs = await query(
      "SELECT subject_group_offering_id AS offeringId, midterm_no AS midtermNo FROM lab_assignments WHERE id = ?",
      [id],
    );
    await offeringAccess(
      req.user,
      requireRecord(labs[0], "Lab not found.").offeringId,
    );
    await transaction(async (connection) => {
      await lockTeachingOffering(connection, req.user, labs[0].offeringId);
      await requireLabsEditable(
        connection,
        labs[0].offeringId,
        labs[0].midtermNo,
      );
      const [attachments] = await connection.execute(
        "SELECT id FROM lab_attachments WHERE lab_assignment_id = ? LIMIT 1",
        [id],
      );
      if (attachments.length)
        throw new ApiError(
          409,
          "ATTACHMENTS_EXIST",
          "Delete this lab’s attachments before deleting the lab.",
        );
      await connection.execute("DELETE FROM lab_assignments WHERE id = ?", [
        id,
      ]);
    });
    res.status(204).end();
  }),
);

assessmentRouter.get(
  "/offerings/:id/midterms/:no/progress",
  requireRole("teacher", "admin"),
  asyncRoute(async (req, res) => {
    const offeringId = idParam(req.params.id);
    const midtermNo = midtermParam(req.params.no);
    await offeringAccess(req.user, offeringId);
    const labGroupId = req.query.labGroupId
      ? idParam(req.query.labGroupId)
      : null;
    const params = [offeringId, midtermNo];
    let filter = "";
    if (labGroupId) {
      filter = " AND sse.lab_group_id = ?";
      params.push(labGroupId);
    }
    if (req.user.role === "teacher") {
      filter +=
        " AND EXISTS (SELECT 1 FROM teacher_subject_assignments tsa WHERE tsa.subject_group_offering_id = sse.subject_group_offering_id AND tsa.lab_group_id = sse.lab_group_id AND tsa.teacher_id = ?)";
      params.push(req.user.profileId);
    }
    const rows = await query(
      `SELECT sse.id AS enrollmentId, sse.lab_group_id AS labGroupId,
    s.id AS studentId, s.first_name AS firstName, s.last_name AS lastName,
    p.lab_count AS labCount, p.absences, p.lab_points AS labPoints,
    p.exam_points AS examScore, p.overall_points AS overallPoints, p.eligibility
    FROM student_subject_enrollments sse JOIN students s ON s.id = sse.student_id
    JOIN student_midterm_progress p ON p.student_subject_enrollment_id = sse.id
    WHERE sse.subject_group_offering_id = ? AND p.midterm_no = ?${filter}
    ORDER BY s.last_name, s.first_name`,
      params,
    );
    const resultRows = await query(
      `SELECT slr.student_subject_enrollment_id AS enrollmentId,
    slr.lab_assignment_id AS labId, slr.grade, slr.attendance
    FROM student_lab_results slr JOIN lab_assignments la ON la.id = slr.lab_assignment_id
    WHERE la.subject_group_offering_id = ? AND la.midterm_no = ?`,
      [offeringId, midtermNo],
    );
    res.json(
      rows.map((row) => ({
        ...row,
        labResults: resultRows.filter(
          (result) => result.enrollmentId === row.enrollmentId,
        ),
      })),
    );
  }),
);

assessmentRouter.put(
  "/labs/:labId/results/:enrollmentId",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const labId = idParam(req.params.labId);
    const enrollmentId = idParam(req.params.enrollmentId);
    const data = validate(resultInput, req.body);
    const labs = await query(
      "SELECT subject_group_offering_id AS offeringId, midterm_no AS midtermNo FROM lab_assignments WHERE id = ?",
      [labId],
    );
    const lab = requireRecord(labs[0], "Lab not found.");
    await offeringAccess(req.user, lab.offeringId);
    await transaction(async (connection) => {
      await lockTeachingOffering(connection, req.user, lab.offeringId);
      await teacherOwnsEnrollment(
        connection,
        req.user.profileId,
        enrollmentId,
        lab.offeringId,
      );
      await requireGroupOpen(
        connection,
        enrollmentId,
        (
          await query(
            "SELECT midterm_no AS n FROM lab_assignments WHERE id=?",
            [labId],
          )
        )[0].n,
      );
      await connection.execute(
        `INSERT INTO student_lab_results (lab_assignment_id, student_subject_enrollment_id, grade, attendance)
    VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE grade = VALUES(grade), attendance = VALUES(attendance)`,
        [labId, enrollmentId, data.grade, data.attendance],
      );
    });
    res.json({ labId, enrollmentId, ...data });
  }),
);

assessmentRouter.put(
  "/offerings/:id/midterms/:no/exam-results/:enrollmentId",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const offeringId = idParam(req.params.id);
    const midtermNo = midtermParam(req.params.no);
    const enrollmentId = idParam(req.params.enrollmentId);
    const { examScore } = validate(
      z.strictObject({ examScore: z.number().int().min(0).max(4).nullable() }),
      req.body,
    );
    await offeringAccess(req.user, offeringId);
    await transaction(async (connection) => {
      await lockTeachingOffering(connection, req.user, offeringId);
      await teacherOwnsEnrollment(
        connection,
        req.user.profileId,
        enrollmentId,
        offeringId,
      );
      await requireGroupOpen(connection, enrollmentId, midtermNo);
      await connection.execute(
        `INSERT INTO student_midterm_results (student_subject_enrollment_id, midterm_no, exam_score)
    VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE exam_score = VALUES(exam_score)`,
        [enrollmentId, midtermNo, examScore],
      );
    });
    res.json({ enrollmentId, midtermNo, examScore });
  }),
);

assessmentRouter.post(
  "/offerings/:id/midterms/:no/lock",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const offeringId = idParam(req.params.id);
    const midtermNo = midtermParam(req.params.no);
    await offeringAccess(req.user, offeringId);
    await transaction(async (connection) => {
      await lockTeachingOffering(connection, req.user, offeringId);
      const [rows] = await connection.execute(
        `SELECT status FROM offering_midterms
      WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE`,
        [offeringId, midtermNo],
      );
      if (requireRecord(rows[0]).status !== "OPEN")
        throw new ApiError(409, "MIDTERM_LOCKED", "Midterm is already locked.");
      const readiness = (await midtermReadiness(connection, offeringId)).find(
        (row) => row.midtermNo === midtermNo,
      );
      if (!readiness.canLock)
        throw new ApiError(
          409,
          "MIDTERM_INCOMPLETE",
          readiness.lockIssues.join(" "),
        );
      await connection.execute(
        `UPDATE offering_midterms SET status = 'LOCKED',
      locked_at = UTC_TIMESTAMP(), locked_by_teacher_id = ?
      WHERE subject_group_offering_id = ? AND midterm_no = ?`,
        [req.user.profileId, offeringId, midtermNo],
      );
    });
    res.json({ offeringId, midtermNo, status: "LOCKED" });
  }),
);

assessmentRouter.post(
  "/offerings/:id/midterms/2/start",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    await transaction(async (c) => {
      await lockTeachingOffering(c, req.user, id);
      const rows = await groupMidterms(c, id, req.user.profileId);
      if (
        !rows.length ||
        rows.filter((g) => g.midtermNo === 1).some((g) => !g.locked)
      )
        throw new ApiError(
          409,
          "INCOMPLETE",
          "Lock the first midterm in each of your lab groups first.",
        );
      await c.execute(
        "INSERT IGNORE INTO teacher_midterm_starts(offering_id,teacher_id) VALUES (?,?)",
        [id, req.user.profileId],
      );
    });
    res.json({ started: true });
  }),
);
assessmentRouter.put(
  "/offerings/:id/lab-groups/:group/midterms/:no/lock",
  requireRole("teacher"),
  asyncRoute(async (req, res) => {
    const id = idParam(req.params.id),
      group = idParam(req.params.group),
      no = midtermParam(req.params.no);
    const { locked } = validate(
      z.strictObject({ locked: z.boolean() }),
      req.body,
    );
    await transaction(async (c) => {
      await lockTeachingOffering(c, req.user, id);
      const rows = await groupMidterms(c, id, req.user.profileId),
        own = rows.find((g) => g.id === group && g.midtermNo === no);
      if (!own)
        throw new ApiError(
          403,
          "FORBIDDEN",
          "This lab group is not assigned to you.",
        );
      if (own.legacyLocked)
        throw new ApiError(
          409,
          "LEGACY_LOCK",
          "This midterm was finalized under the previous workflow.",
        );
      if (locked) {
        const readiness = (await midtermReadiness(c, id)).find(
          (m) => m.midtermNo === no,
        );
        const issues = readiness.lockIssues
          .filter(
            (s) => !s.includes(": complete") || s.startsWith(own.code + ":"),
          )
          .filter((s) => s !== "Lock the first midterm first.");
        if (no === 2 && !own.started)
          issues.push("Start the second midterm first.");
        if (issues.length)
          throw new ApiError(409, "MIDTERM_INCOMPLETE", issues.join(" "));
      }
      await c.execute(
        "INSERT INTO lab_group_midterms(offering_id,lab_group_id,midterm_no,is_locked) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE is_locked=VALUES(is_locked)",
        [id, group, no, locked],
      );
    });
    res.json({ locked });
  }),
);
