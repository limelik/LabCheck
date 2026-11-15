import { Router } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import multer from "multer";
import { pool } from "./db.js";

const router = Router();
const MAX_STUDENTS_PER_LAB = 16;
const uploadDirectory = join(process.cwd(), "server", "storage", "uploads");
await mkdir(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

async function removeStoredFile(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

router.use((request, response, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      request.get("origin") !== (process.env.APP_ORIGIN || "http://localhost:5173")) {
    return response.status(403).json({ error: "Request origin is not allowed." });
  }
  return next();
});

function requireRole(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ error: "You do not have permission to perform this action." });
    }
    return next();
  };
}

function toId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function asBool(value) {
  return Boolean(Number(value));
}

router.get("/bootstrap", async (request, response) => {
  const [unitRows] = await pool.query("SELECT id, code, name FROM academic_units ORDER BY code");
  const [specializationRows] = await pool.query(
    "SELECT id, academic_unit_id AS academicUnitId, code, name FROM specializations ORDER BY code"
  );
  const [groupRows] = await pool.query(
    `SELECT ag.id, ag.code, ag.name, ag.specialization_id AS specializationId,
            COUNT(DISTINCT s.id) AS studentCount
     FROM academic_groups ag
     LEFT JOIN students s ON s.academic_group_id = ag.id
     GROUP BY ag.id ORDER BY ag.code`
  );
  const [labGroupRows] = await pool.query(
    "SELECT id, academic_group_id AS academicGroupId, code FROM lab_groups ORDER BY code"
  );
  const [subjectRows] = await pool.query("SELECT id, code, name FROM subjects ORDER BY code");
  const [teacherRows] = await pool.query(
    `SELECT t.id, t.first_name AS firstName, t.last_name AS lastName,
            ua.email, ua.is_active AS isActive, ua.approval_status AS approvalStatus
     FROM teachers t JOIN user_accounts ua ON ua.id = t.user_account_id
     ORDER BY t.last_name, t.first_name`
  );
  const [studentRows] = await pool.query(
    `SELECT s.id, s.first_name AS firstName, s.last_name AS lastName, ua.email,
            ag.code AS academicGroupId
     FROM students s
     JOIN user_accounts ua ON ua.id = s.user_account_id
     JOIN academic_groups ag ON ag.id = s.academic_group_id
     ORDER BY s.last_name, s.first_name`
  );
  const [offeringRows] = await pool.query(
    `SELECT sgo.id, sub.code AS subjectId, ag.code AS academicGroupId,
            sgo.academic_year AS academicYear, sgo.semester, sgo.total_grade AS totalGrade,
            sgo.is_active AS isActive
     FROM subject_group_offerings sgo
     JOIN subjects sub ON sub.id = sgo.subject_id
     JOIN academic_groups ag ON ag.id = sgo.academic_group_id
     ORDER BY sgo.academic_year DESC, sgo.semester, sub.code`
  );
  const [assignmentRows] = await pool.query(
    `SELECT tsa.teacher_id AS teacherId,
            tsa.subject_group_offering_id AS subjectOfferingId, lg.code AS labGroupId
     FROM teacher_subject_assignments tsa JOIN lab_groups lg ON lg.id = tsa.lab_group_id`
  );
  const [enrollmentRows] = await pool.query(
    `SELECT sse.id, sse.student_id AS studentId,
            sse.subject_group_offering_id AS subjectOfferingId,
            current_lg.code AS labGroupId, default_lg.code AS defaultLabGroupId
     FROM student_subject_enrollments sse
     JOIN lab_groups current_lg ON current_lg.id = sse.lab_group_id
     JOIN lab_groups default_lg ON default_lg.id = sse.default_lab_group_id`
  );
  const [requestRows] = await pool.query(
    `SELECT lcr.id, lcr.student_subject_enrollment_id AS studentSubjectEnrollmentId,
            current_lg.code AS currentLabGroupId, requested_lg.code AS requestedLabGroupId,
            lcr.status, lcr.requested_at AS requestedAt, lcr.decided_at AS decidedAt,
            lcr.decided_by_teacher_id AS decidedByTeacherId
     FROM lab_change_requests lcr
     JOIN lab_groups current_lg ON current_lg.id = lcr.current_lab_group_id
     JOIN lab_groups requested_lg ON requested_lg.id = lcr.requested_lab_group_id
     ORDER BY lcr.requested_at DESC`
  );
  const [midtermRows] = await pool.query(
    `SELECT subject_group_offering_id AS offeringId, midterm_no AS midtermNo, status
     FROM offering_midterms`
  );
  const [labRows] = await pool.query(
    `SELECT la.id, la.subject_group_offering_id AS subjectOfferingId,
            la.midterm_no AS midtermNo, la.lab_number AS number, la.title,
            la.description, la.max_grade AS difficulty
     FROM lab_assignments la ORDER BY la.lab_number`
  );
  const [attachmentRows] = await pool.query(
    `SELECT id, lab_assignment_id AS labId, original_name AS name
     FROM lab_attachments ORDER BY created_at, id`
  );
  const [labResultRows] = await pool.query(
    `SELECT slr.student_subject_enrollment_id AS enrollmentId,
            slr.lab_assignment_id AS labId, slr.grade, slr.attendance
     FROM student_lab_results slr`
  );
  const [examRows] = await pool.query(
    `SELECT student_subject_enrollment_id AS enrollmentId, midterm_no AS midtermNo, exam_score AS examScore
     FROM student_midterm_results`
  );

  const groups = groupRows.map((group) => ({
    id: group.code,
    code: group.code,
    name: group.name,
    specializationId: group.specializationId,
    studentCount: Number(group.studentCount),
    recommendedLabCount: Math.ceil(Number(group.studentCount) / MAX_STUDENTS_PER_LAB),
    labGroupIds: labGroupRows
      .filter((labGroup) => labGroup.academicGroupId === group.id)
      .map((labGroup) => labGroup.code),
  }));
  const labGroups = labGroupRows.map((labGroup) => ({
    id: labGroup.code,
    code: labGroup.code,
    name: labGroup.code,
    academicGroupId: groupRows.find((group) => group.id === labGroup.academicGroupId)?.code,
  }));
  const offerings = offeringRows.map((offering) => ({
    ...offering,
    totalGrade: Number(offering.totalGrade),
    isActive: asBool(offering.isActive),
    createdAt: null,
  }));
  const enrollments = enrollmentRows.map((enrollment) => ({ ...enrollment }));
  const students = studentRows.map((student) => ({ ...student }));
  const teachers = teacherRows.map((teacher) => ({
    id: teacher.id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
    status: teacher.isActive && teacher.approvalStatus === "APPROVED" ? "active" : "pending",
  }));
  const assignmentRowsNormalized = assignmentRows.map((assignment) => ({ ...assignment }));
  const offeringById = new Map(offerings.map((item) => [item.id, item]));
  const account = request.user;
  const [profileRows] = await pool.execute(
    `SELECT s.id, s.first_name AS firstName, s.last_name AS lastName
     FROM students s WHERE s.user_account_id = ?`,
    [account.id]
  );
  const [teacherProfileRows] = await pool.execute(
    `SELECT t.id, t.first_name AS firstName, t.last_name AS lastName
     FROM teachers t WHERE t.user_account_id = ?`,
    [account.id]
  );
  const visibleOfferingIds = account.role === "admin"
    ? new Set(offerings.map((item) => item.id))
    : account.role === "teacher"
      ? new Set(assignmentRowsNormalized
          .filter((item) => teacherProfileRows[0] && item.teacherId === teacherProfileRows[0].id)
          .map((item) => item.subjectOfferingId))
      : new Set(enrollments
          .filter((item) => profileRows[0] && item.studentId === profileRows[0].id)
          .map((item) => item.subjectOfferingId));
  const labsBySubjectAndGroup = {};
  const progress = {};
  const midterms = {};

  for (const midterm of midtermRows) {
    if (!visibleOfferingIds.has(midterm.offeringId)) continue;
    const offering = offeringById.get(midterm.offeringId);
    if (!offering) continue;
    const key = `${offering.subjectId}:${offering.academicGroupId}`;
    midterms[key] ??= {};
    midterms[key][midterm.midtermNo] = midterm.status;
  }

  for (const lab of labRows) {
    if (!visibleOfferingIds.has(lab.subjectOfferingId)) continue;
    const offering = offeringById.get(lab.subjectOfferingId);
    if (!offering) continue;
    labsBySubjectAndGroup[offering.subjectId] ??= {};
    labsBySubjectAndGroup[offering.subjectId][offering.academicGroupId] ??= [];
    labsBySubjectAndGroup[offering.subjectId][offering.academicGroupId].push({
      ...lab,
      difficulty: Number(lab.difficulty),
      attachments: attachmentRows
        .filter((attachment) => attachment.labId === lab.id)
        .map(({ id, name }) => ({ id, name })),
    });
  }

  const enrollmentById = new Map(enrollments.map((item) => [item.id, item]));
  const labById = new Map(labRows.map((item) => [item.id, item]));
  const studentById = new Map(students.map((item) => [item.id, item]));
  const subjectNames = new Map(subjectRows.map((item) => [item.code, item.name]));
  const initializeProgress = (enrollment) => {
    const offering = offeringById.get(enrollment.subjectOfferingId);
    const student = studentById.get(enrollment.studentId);
    if (!offering || !student) return null;
    const key = `${offering.subjectId}:${offering.academicGroupId}:${enrollment.labGroupId}`;
    progress[key] ??= { subjectId: offering.subjectId, groupId: offering.academicGroupId, labGroupId: enrollment.labGroupId, students: [] };
    const row = {
      id: enrollment.studentId,
      enrollmentId: enrollment.id,
      name: `${student.firstName} ${student.lastName}`,
      labs: {},
      examScores: {},
    };
    progress[key].students.push(row);
    return row;
  };
  const progressByEnrollment = new Map();
  for (const enrollment of enrollments) {
    const row = initializeProgress(enrollment);
    if (row) progressByEnrollment.set(enrollment.id, row);
  }
  for (const result of labResultRows) {
    const row = progressByEnrollment.get(result.enrollmentId);
    const lab = labById.get(result.labId);
    if (!row || !lab) continue;
    row.labs[lab.id] = {
      grade: result.grade == null ? "empty" : Number(result.grade),
      attendance: result.attendance === "UNMARKED" ? "empty" : result.attendance.toLowerCase(),
    };
  }
  for (const result of examRows) {
    const row = progressByEnrollment.get(result.enrollmentId);
    if (row) row.examScores[result.midtermNo] = result.examScore == null ? null : Number(result.examScore);
  }

  const visibleAssignments = account.role === "teacher"
    ? assignmentRowsNormalized.filter((item) => teacherProfileRows[0] && item.teacherId === teacherProfileRows[0].id)
    : account.role === "student"
      ? assignmentRowsNormalized.filter((assignment) =>
          enrollments.some((enrollment) =>
            profileRows[0] && enrollment.studentId === profileRows[0].id &&
            enrollment.subjectOfferingId === assignment.subjectOfferingId
          )
        )
      : assignmentRowsNormalized;
  const visibleEnrollments = account.role === "student"
    ? enrollments.filter((item) => profileRows[0] && item.studentId === profileRows[0].id)
    : account.role === "teacher"
      ? enrollments.filter((item) => visibleAssignments.some((assignment) =>
          assignment.subjectOfferingId === item.subjectOfferingId &&
          assignment.labGroupId === item.labGroupId
        ))
      : enrollments;
  const visibleStudentIds = new Set(visibleEnrollments.map((item) => item.studentId));
  const visibleStudents = account.role === "admin"
    ? students
    : students.filter((student) => visibleStudentIds.has(student.id));
  const visibleTeachers = account.role === "admin"
    ? teachers
    : account.role === "teacher"
      ? teachers.filter((teacher) => teacherProfileRows[0] && teacher.id === teacherProfileRows[0].id)
      : [];
  const visibleRequests = account.role === "teacher"
    ? requestRows.filter((item) => {
        const enrollment = enrollmentById.get(item.studentSubjectEnrollmentId);
        return enrollment && visibleAssignments.some((assignment) =>
          assignment.subjectOfferingId === enrollment.subjectOfferingId &&
          assignment.labGroupId === enrollment.labGroupId
        );
      })
    : account.role === "student"
      ? requestRows.filter((item) => visibleEnrollments.some((enrollment) =>
          enrollment.id === item.studentSubjectEnrollmentId
        ))
      : requestRows;

  const groupedProgress = {};
  for (const entry of Object.values(progress)) {
    entry.students = entry.students.filter((student) =>
      visibleEnrollments.some((enrollment) => enrollment.id === student.enrollmentId)
    );
    if (!entry.students.length) continue;
    groupedProgress[entry.subjectId] ??= {};
    groupedProgress[entry.subjectId][entry.groupId] ??= {};
    groupedProgress[entry.subjectId][entry.groupId][entry.labGroupId] = { students: entry.students };
  }

  return response.json({
    user: account,
    currentStudent: profileRows[0] ?? null,
    currentTeacher: teacherProfileRows[0] ?? null,
    academicUnits: unitRows.map((item) => ({ ...item })),
    specializations: specializationRows.map((item) => ({ ...item })),
    academicGroups: groups,
    labGroups,
    subjectCatalog: subjectRows.map((item) => ({ ...item, id: item.code })),
    students: visibleStudents,
    teachers: visibleTeachers,
    offerings: offerings.filter((offering) => visibleOfferingIds.has(offering.id)),
    teacherAssignments: visibleAssignments,
    enrollments: visibleEnrollments,
    labChangeRequests: visibleRequests,
    labs: labsBySubjectAndGroup,
    teacherProgressData: groupedProgress,
    midterms,
    maxStudentsPerLab: MAX_STUDENTS_PER_LAB,
    subjectNames: Object.fromEntries(subjectNames),
  });
});

router.get("/admin/approvals", requireRole("admin"), async (request, response) => {
  const [rows] = await pool.query(
    `SELECT ua.id, ua.email, ua.account_type AS role, ua.email_verified_at AS emailVerifiedAt,
            COALESCE(s.first_name, t.first_name) AS firstName,
            COALESCE(s.last_name, t.last_name) AS lastName, ag.code AS groupCode
     FROM user_accounts ua
     LEFT JOIN students s ON s.user_account_id = ua.id
     LEFT JOIN academic_groups ag ON ag.id = s.academic_group_id
     LEFT JOIN teachers t ON t.user_account_id = ua.id
     WHERE ua.approval_status = 'PENDING' AND ua.email_verified_at IS NOT NULL
     ORDER BY ua.account_type, ua.email`
  );
  return response.json({ users: rows });
});

router.patch("/admin/approvals/:id", requireRole("admin"), async (request, response) => {
  const id = toId(request.params.id);
  const status = request.body.status;
  if (!id || !["APPROVED", "REJECTED"].includes(status)) {
    return response.status(400).json({ error: "Choose an account and a valid approval decision." });
  }
  const [result] = await pool.execute(
    `UPDATE user_accounts SET approval_status = ?, reviewed_by_user_account_id = ?,
       reviewed_at = UTC_TIMESTAMP()
     WHERE id = ? AND email_verified_at IS NOT NULL AND approval_status = 'PENDING'`,
    [status, request.user.id, id]
  );
  if (!result.affectedRows) return response.status(409).json({ error: "Account is not awaiting approval." });
  return response.json({ success: true });
});

router.post("/admin/offerings", requireRole("admin"), async (request, response) => {
  const { subjectId, academicGroupId, academicYear, semester } = request.body;
  if (!subjectId || !academicGroupId || !/^\d{4}-\d{4}$/.test(academicYear || "") ||
      !["Fall", "Spring"].includes(semester)) {
    return response.status(400).json({ error: "Provide a subject, academic group, academic year, and semester." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[subject]] = await connection.execute("SELECT id FROM subjects WHERE code = ?", [subjectId]);
    const [[group]] = await connection.execute("SELECT id FROM academic_groups WHERE code = ?", [academicGroupId]);
    if (!subject || !group) {
      await connection.rollback();
      return response.status(404).json({ error: "Subject or academic group was not found." });
    }
    const [existing] = await connection.execute(
      `SELECT id FROM subject_group_offerings
       WHERE subject_id = ? AND academic_group_id = ? AND academic_year = ? AND semester = ?`,
      [subject.id, group.id, academicYear, semester]
    );
    if (existing.length) {
      await connection.rollback();
      return response.status(409).json({ error: "Offering already exists for this group, year, and semester." });
    }
    const [labGroups] = await connection.execute(
      "SELECT id FROM lab_groups WHERE academic_group_id = ? ORDER BY code",
      [group.id]
    );
    const [students] = await connection.execute(
      "SELECT id FROM students WHERE academic_group_id = ? ORDER BY last_name, first_name, id FOR UPDATE",
      [group.id]
    );
    if (students.length && !labGroups.length) {
      await connection.rollback();
      return response.status(409).json({ error: "Create lab groups for this academic group before creating an offering." });
    }
    const requiredGroups = Math.ceil(students.length / MAX_STUDENTS_PER_LAB);
    if (labGroups.length < requiredGroups) {
      await connection.rollback();
      return response.status(409).json({ error: `This group needs at least ${requiredGroups} lab groups before it can be offered.` });
    }

    const [offeringResult] = await connection.execute(
      `INSERT INTO subject_group_offerings
       (subject_id, academic_group_id, academic_year, semester)
       VALUES (?, ?, ?, ?)`,
      [subject.id, group.id, academicYear, semester]
    );
    const offeringId = offeringResult.insertId;
    await connection.execute(
      `INSERT INTO offering_midterms (subject_group_offering_id, midterm_no)
       VALUES (?, 1), (?, 2)`,
      [offeringId, offeringId]
    );
    for (let index = 0; index < students.length; index++) {
      const labGroupId = labGroups[index % labGroups.length].id;
      await connection.execute(
        `INSERT INTO student_subject_enrollments
         (student_id, subject_group_offering_id, lab_group_id, default_lab_group_id)
         VALUES (?, ?, ?, ?)`,
        [students[index].id, offeringId, labGroupId, labGroupId]
      );
    }
    await connection.commit();
    return response.status(201).json({ id: offeringId });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.patch("/admin/offerings/:id/active", requireRole("admin"), async (request, response) => {
  const id = toId(request.params.id);
  if (!id || typeof request.body.isActive !== "boolean") {
    return response.status(400).json({ error: "Provide a valid offering and active state." });
  }
  const [result] = await pool.execute(
    "UPDATE subject_group_offerings SET is_active = ? WHERE id = ?",
    [request.body.isActive, id]
  );
  if (!result.affectedRows) return response.status(404).json({ error: "Offering not found." });
  return response.json({ success: true });
});

router.post("/admin/teacher-coverage", requireRole("admin"), async (request, response) => {
  const teacherId = toId(request.body.teacherId);
  const offeringId = toId(request.body.subjectOfferingId);
  const mode = request.body.mode === "split" ? "split" : "all";
  if (!teacherId || !offeringId) return response.status(400).json({ error: "Choose a teacher and offering." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [offeringRows] = await connection.execute(
      "SELECT id, academic_group_id FROM subject_group_offerings WHERE id = ? FOR UPDATE",
      [offeringId]
    );
    const [teacherRows] = await connection.execute("SELECT id FROM teachers WHERE id = ?", [teacherId]);
    if (!offeringRows.length || !teacherRows.length) {
      await connection.rollback();
      return response.status(404).json({ error: "Teacher or offering not found." });
    }
    const [availableGroups] = await connection.execute(
      "SELECT id, code FROM lab_groups WHERE academic_group_id = ? ORDER BY code",
      [offeringRows[0].academic_group_id]
    );
    const requestedCodes = Array.isArray(request.body.labGroupIds)
      ? request.body.labGroupIds.map(String)
      : [];
    const targets = mode === "all"
      ? availableGroups
      : availableGroups.filter((group) => requestedCodes.includes(group.code));
    if (!targets.length || (mode === "split" && targets.length !== new Set(requestedCodes).size)) {
      await connection.rollback();
      return response.status(400).json({ error: "Select valid lab groups for this offering." });
    }
    for (const group of targets) {
      await connection.execute(
        `INSERT INTO teacher_subject_assignments (teacher_id, subject_group_offering_id, lab_group_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)`,
        [teacherId, offeringId, group.id]
      );
    }
    await connection.commit();
    return response.json({ assignedCount: targets.length });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.post("/student/lab-change-requests", requireRole("student"), async (request, response) => {
  const enrollmentId = toId(request.body.studentSubjectEnrollmentId);
  const requestedCode = typeof request.body.requestedLabGroupId === "string"
    ? request.body.requestedLabGroupId.trim()
    : "";
  if (!enrollmentId || !requestedCode) return response.status(400).json({ error: "Choose a target lab group." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [enrollments] = await connection.execute(
      `SELECT sse.id, sse.lab_group_id AS currentGroupId, sgo.academic_group_id AS academicGroupId,
              s.user_account_id
       FROM student_subject_enrollments sse
       JOIN subject_group_offerings sgo ON sgo.id = sse.subject_group_offering_id
       JOIN students s ON s.id = sse.student_id
       WHERE sse.id = ? FOR UPDATE`,
      [enrollmentId]
    );
    const enrollment = enrollments[0];
    if (!enrollment || enrollment.user_account_id !== request.user.id) {
      await connection.rollback();
      return response.status(404).json({ error: "Enrollment not found." });
    }
    const [targetGroups] = await connection.execute(
      "SELECT id FROM lab_groups WHERE code = ? AND academic_group_id = ?",
      [requestedCode, enrollment.academicGroupId]
    );
    if (!targetGroups.length || targetGroups[0].id === enrollment.currentGroupId) {
      await connection.rollback();
      return response.status(400).json({ error: "Choose a different lab group in your academic group." });
    }
    const [result] = await connection.execute(
      `INSERT INTO lab_change_requests
       (student_subject_enrollment_id, current_lab_group_id, requested_lab_group_id)
       VALUES (?, ?, ?)`,
      [enrollment.id, enrollment.currentGroupId, targetGroups[0].id]
    );
    await connection.commit();
    return response.status(201).json({ id: result.insertId });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({ error: "A pending request already exists for this enrollment." });
    }
    throw error;
  } finally {
    connection.release();
  }
});

router.patch("/teacher/lab-change-requests/:id", requireRole("teacher"), async (request, response) => {
  const id = toId(request.params.id);
  const status = request.body.status;
  if (!id || !["APPROVED", "REJECTED"].includes(status)) {
    return response.status(400).json({ error: "Choose an approval decision." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [teachers] = await connection.execute(
      "SELECT id FROM teachers WHERE user_account_id = ?",
      [request.user.id]
    );
    if (!teachers.length) {
      await connection.rollback();
      return response.status(403).json({ error: "Teacher profile not found." });
    }
    const [requests] = await connection.execute(
      `SELECT lcr.id, lcr.student_subject_enrollment_id AS enrollmentId,
              lcr.requested_lab_group_id AS requestedGroupId,
              sse.subject_group_offering_id AS offeringId,
              sse.lab_group_id AS currentGroupId
       FROM lab_change_requests lcr
       JOIN student_subject_enrollments sse ON sse.id = lcr.student_subject_enrollment_id
       JOIN teacher_subject_assignments tsa
         ON tsa.subject_group_offering_id = sse.subject_group_offering_id
        AND tsa.lab_group_id = sse.lab_group_id
        AND tsa.teacher_id = ?
       WHERE lcr.id = ? AND lcr.status = 'PENDING'
       LIMIT 1 FOR UPDATE`,
      [teachers[0].id, id]
    );
    if (!requests.length) {
      await connection.rollback();
      return response.status(404).json({ error: "Pending request not found in your offerings." });
    }
    if (status === "APPROVED") {
      await connection.execute(
        "SELECT id FROM lab_groups WHERE id = ? FOR UPDATE",
        [requests[0].requestedGroupId]
      );
      const [capacity] = await connection.execute(
        `SELECT COUNT(*) AS count FROM student_subject_enrollments
         WHERE subject_group_offering_id = ? AND lab_group_id = ?`,
        [requests[0].offeringId, requests[0].requestedGroupId]
      );
      if (Number(capacity[0].count) >= MAX_STUDENTS_PER_LAB) {
        await connection.rollback();
        return response.status(409).json({ error: "Requested lab group is full." });
      }
    }
    await connection.execute(
      `UPDATE lab_change_requests
       SET status = ?, decided_at = UTC_TIMESTAMP(), decided_by_teacher_id = ?
       WHERE id = ?`,
      [status, teachers[0].id, id]
    );
    await connection.commit();
    return response.json({ success: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

async function getTeacherId(connection, userAccountId) {
  const [rows] = await connection.execute(
    "SELECT id FROM teachers WHERE user_account_id = ?",
    [userAccountId]
  );
  return rows[0]?.id ?? null;
}

async function getAssignedOffering(connection, teacherId, subjectCode, groupCode, lock = false) {
  const [rows] = await connection.execute(
    `SELECT sgo.id, sgo.academic_group_id AS academicGroupId
     FROM subject_group_offerings sgo
     JOIN subjects sub ON sub.id = sgo.subject_id
     JOIN academic_groups ag ON ag.id = sgo.academic_group_id
     JOIN teacher_subject_assignments tsa ON tsa.subject_group_offering_id = sgo.id
     WHERE sub.code = ? AND ag.code = ? AND tsa.teacher_id = ?
     GROUP BY sgo.id, sgo.academic_group_id
     ORDER BY sgo.academic_year DESC, sgo.id DESC
     LIMIT 2${lock ? " FOR UPDATE" : ""}`,
    [subjectCode, groupCode, teacherId]
  );
  if (!rows.length) return { error: "You are not assigned to this subject and group." };
  if (rows.length > 1) return { error: "Select a specific semester offering; this group has more than one." };
  return { offering: rows[0] };
}

function validateLabInput(body, includeMidterm) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const difficulty = Number(body.difficulty);
  const midtermNo = Number(body.midtermNo);
  if (!title || title.length > 255 || description.length > 20000 ||
      !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5 ||
      (includeMidterm && ![1, 2].includes(midtermNo))) {
    return { error: "Provide a title, description, difficulty from 1 to 5, and valid midterm." };
  }
  return { title, description, difficulty, midtermNo };
}

router.post("/teacher/labs", requireRole("teacher"), async (request, response) => {
  const validation = validateLabInput(request.body, true);
  if (validation.error) return response.status(400).json({ error: validation.error });
  const subjectCode = String(request.body.subjectId || "");
  const groupCode = String(request.body.groupId || "");
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacherId = await getTeacherId(connection, request.user.id);
    if (!teacherId) {
      await connection.rollback();
      return response.status(403).json({ error: "Teacher profile not found." });
    }
    const { offering, error } = await getAssignedOffering(connection, teacherId, subjectCode, groupCode, true);
    if (!offering) {
      await connection.rollback();
      return response.status(403).json({ error });
    }
    const [midterms] = await connection.execute(
      `SELECT status FROM offering_midterms
       WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE`,
      [offering.id, validation.midtermNo]
    );
    if (!midterms.length || midterms[0].status !== "OPEN") {
      await connection.rollback();
      return response.status(409).json({ error: "This midterm is locked." });
    }
    const [labCounts] = await connection.execute(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(CASE WHEN midterm_no = ? THEN max_grade ELSE 0 END), 0) AS midtermPoints,
              COALESCE(MAX(lab_number), 0) AS lastNumber
       FROM lab_assignments WHERE subject_group_offering_id = ?`,
      [validation.midtermNo, offering.id]
    );
    if (Number(labCounts[0].count) >= 14) {
      await connection.rollback();
      return response.status(409).json({ error: "An offering can have at most 14 labs." });
    }
    if (Number(labCounts[0].midtermPoints) + validation.difficulty > 16) {
      await connection.rollback();
      return response.status(409).json({ error: "Labs in one midterm cannot total more than 16 points." });
    }
    const [result] = await connection.execute(
      `INSERT INTO lab_assignments
       (subject_group_offering_id, midterm_no, lab_number, title, description, max_grade)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [offering.id, validation.midtermNo, Number(labCounts[0].lastNumber) + 1,
        validation.title, validation.description || null, validation.difficulty]
    );
    await connection.commit();
    return response.status(201).json({ id: result.insertId });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.patch("/teacher/labs/:id", requireRole("teacher"), async (request, response) => {
  const labId = toId(request.params.id);
  const validation = validateLabInput(request.body, false);
  if (!labId || validation.error) return response.status(400).json({ error: validation.error || "Invalid lab." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacherId = await getTeacherId(connection, request.user.id);
    const [labs] = await connection.execute(
      `SELECT la.id, la.subject_group_offering_id AS offeringId, la.midterm_no AS midtermNo,
              la.max_grade AS oldDifficulty
       FROM lab_assignments la
       JOIN teacher_subject_assignments tsa ON tsa.subject_group_offering_id = la.subject_group_offering_id
       WHERE la.id = ? AND tsa.teacher_id = ? LIMIT 1 FOR UPDATE`,
      [labId, teacherId]
    );
    if (!labs.length) {
      await connection.rollback();
      return response.status(404).json({ error: "Assigned lab not found." });
    }
    const lab = labs[0];
    const [midterms] = await connection.execute(
      "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE",
      [lab.offeringId, lab.midtermNo]
    );
    if (midterms[0]?.status !== "OPEN") {
      await connection.rollback();
      return response.status(409).json({ error: "This midterm is locked." });
    }
    const [sumRows] = await connection.execute(
      `SELECT COALESCE(SUM(max_grade), 0) AS points FROM lab_assignments
       WHERE subject_group_offering_id = ? AND midterm_no = ? AND id <> ?`,
      [lab.offeringId, lab.midtermNo, labId]
    );
    if (Number(sumRows[0].points) + validation.difficulty > 16) {
      await connection.rollback();
      return response.status(409).json({ error: "Labs in one midterm cannot total more than 16 points." });
    }
    await connection.execute(
      "UPDATE lab_assignments SET title = ?, description = ?, max_grade = ? WHERE id = ?",
      [validation.title, validation.description || null, validation.difficulty, labId]
    );
    await connection.commit();
    return response.json({ success: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.delete("/teacher/labs/:id", requireRole("teacher"), async (request, response) => {
  const labId = toId(request.params.id);
  if (!labId) return response.status(400).json({ error: "Invalid lab." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacherId = await getTeacherId(connection, request.user.id);
    const [labs] = await connection.execute(
      `SELECT la.id, la.subject_group_offering_id AS offeringId, la.midterm_no AS midtermNo
       FROM lab_assignments la
       JOIN teacher_subject_assignments tsa ON tsa.subject_group_offering_id = la.subject_group_offering_id
       WHERE la.id = ? AND tsa.teacher_id = ? LIMIT 1 FOR UPDATE`,
      [labId, teacherId]
    );
    if (!labs.length) {
      await connection.rollback();
      return response.status(404).json({ error: "Assigned lab not found." });
    }
    const [midterms] = await connection.execute(
      "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE",
      [labs[0].offeringId, labs[0].midtermNo]
    );
    if (midterms[0]?.status !== "OPEN") {
      await connection.rollback();
      return response.status(409).json({ error: "This midterm is locked." });
    }
    const [attachments] = await connection.execute(
      "SELECT storage_name AS storageName FROM lab_attachments WHERE lab_assignment_id = ?",
      [labId]
    );
    await connection.execute("DELETE FROM lab_assignments WHERE id = ?", [labId]);
    await connection.commit();
    const cleanupFailures = [];
    for (const attachment of attachments) {
      try {
        await unlink(join(uploadDirectory, attachment.storageName));
      } catch (error) {
        if (error.code !== "ENOENT") cleanupFailures.push(error);
      }
    }
    if (cleanupFailures.length) {
      console.error("Could not remove lab attachment files:", cleanupFailures);
      return response.status(500).json({ error: "Lab deleted, but one or more files could not be removed from storage." });
    }
    return response.json({ success: true });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_SIGNAL_EXCEPTION") {
      return response.status(409).json({ error: error.sqlMessage });
    }
    throw error;
  } finally {
    connection.release();
  }
});

router.post("/teacher/labs/:id/attachments", requireRole("teacher"), (request, response, next) => {
  upload.single("file")(request, response, (error) => {
    if (error) return next(error);
    void (async () => {
      if (!request.file) return response.status(400).json({ error: "Choose a file to upload." });

      const labId = toId(request.params.id);
      const originalName = request.file.originalname.split(/[\\/]/).pop()?.trim();
      if (!labId || !originalName || originalName.length > 255) {
        await removeStoredFile(request.file.path);
        return response.status(400).json({ error: "Invalid lab or file name." });
      }
      try {
        const [rows] = await pool.execute(
          `SELECT la.id
           FROM lab_assignments la
           JOIN offering_midterms om
             ON om.subject_group_offering_id = la.subject_group_offering_id
            AND om.midterm_no = la.midterm_no AND om.status = 'OPEN'
           JOIN teacher_subject_assignments tsa
             ON tsa.subject_group_offering_id = la.subject_group_offering_id
            AND tsa.teacher_id = (SELECT id FROM teachers WHERE user_account_id = ?)
           WHERE la.id = ?`,
          [request.user.id, labId]
        );
        if (!rows.length) {
          await removeStoredFile(request.file.path);
          return response.status(404).json({ error: "Open lab assignment not found in your offerings." });
        }
        const [result] = await pool.execute(
          `INSERT INTO lab_attachments
           (lab_assignment_id, uploaded_by_user_account_id, storage_name, original_name, file_size)
           VALUES (?, ?, ?, ?, ?)`,
          [labId, request.user.id, request.file.filename, originalName, request.file.size]
        );
        return response.status(201).json({
          attachment: { id: result.insertId, name: originalName },
        });
      } catch (uploadError) {
        await removeStoredFile(request.file.path);
        return next(uploadError);
      }
    })().catch(next);
  });
});

router.delete("/teacher/labs/:labId/attachments/:attachmentId", requireRole("teacher"), async (request, response) => {
  const labId = toId(request.params.labId);
  const attachmentId = toId(request.params.attachmentId);
  if (!labId || !attachmentId) return response.status(400).json({ error: "Invalid lab attachment." });
  const [rows] = await pool.execute(
    `SELECT a.storage_name AS storageName
     FROM lab_attachments a
     JOIN lab_assignments la ON la.id = a.lab_assignment_id
     JOIN offering_midterms om
       ON om.subject_group_offering_id = la.subject_group_offering_id
      AND om.midterm_no = la.midterm_no AND om.status = 'OPEN'
     JOIN teacher_subject_assignments tsa
       ON tsa.subject_group_offering_id = la.subject_group_offering_id
      AND tsa.teacher_id = (SELECT id FROM teachers WHERE user_account_id = ?)
     WHERE a.id = ? AND a.lab_assignment_id = ?`,
    [request.user.id, attachmentId, labId]
  );
  if (!rows.length) return response.status(404).json({ error: "Attachment not found in your open lab." });
  await pool.execute("DELETE FROM lab_attachments WHERE id = ?", [attachmentId]);
  try {
    await removeStoredFile(join(uploadDirectory, rows[0].storageName));
  } catch (error) {
    console.error("Could not remove lab attachment file:", error);
    return response.status(500).json({ error: "Attachment record was deleted, but its file could not be removed." });
  }
  return response.json({ success: true });
});

router.get("/labs/attachments/:id/download", async (request, response, next) => {
  const attachmentId = toId(request.params.id);
  if (!attachmentId) return response.status(400).json({ error: "Invalid attachment." });
  const [rows] = await pool.execute(
    `SELECT a.storage_name AS storageName, a.original_name AS originalName,
            la.subject_group_offering_id AS offeringId
     FROM lab_attachments a
     JOIN lab_assignments la ON la.id = a.lab_assignment_id
     WHERE a.id = ?`,
    [attachmentId]
  );
  const attachment = rows[0];
  if (!attachment) return response.status(404).json({ error: "Attachment not found." });

  let allowed = request.user.role === "admin";
  if (request.user.role === "student") {
    const [enrollments] = await pool.execute(
      `SELECT sse.id FROM student_subject_enrollments sse
       JOIN students s ON s.id = sse.student_id
       WHERE s.user_account_id = ? AND sse.subject_group_offering_id = ? LIMIT 1`,
      [request.user.id, attachment.offeringId]
    );
    allowed = enrollments.length > 0;
  } else if (request.user.role === "teacher") {
    const [assignments] = await pool.execute(
      `SELECT tsa.teacher_id FROM teacher_subject_assignments tsa
       JOIN teachers t ON t.id = tsa.teacher_id
       WHERE t.user_account_id = ? AND tsa.subject_group_offering_id = ? LIMIT 1`,
      [request.user.id, attachment.offeringId]
    );
    allowed = assignments.length > 0;
  }
  if (!allowed) return response.status(404).json({ error: "Attachment not found." });
  return response.download(
    join(uploadDirectory, attachment.storageName),
    attachment.originalName,
    (error) => {
      if (error && !response.headersSent) next(error);
    }
  );
});

router.put("/teacher/lab-results", requireRole("teacher"), async (request, response) => {
  const enrollmentId = toId(request.body.enrollmentId);
  const labId = toId(request.body.labId);
  const attendanceMap = { present: "PRESENT", absent: "ABSENT", excused: "EXCUSED", empty: "UNMARKED" };
  const attendance = attendanceMap[request.body.attendance];
  const grade = request.body.grade === null ? null : Number(request.body.grade);
  if (!enrollmentId || !labId || !attendance ||
      (grade !== null && (!Number.isInteger(grade) || grade < 0))) {
    return response.status(400).json({ error: "Provide a valid enrollment, lab, grade, and attendance." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacherId = await getTeacherId(connection, request.user.id);
    const [rows] = await connection.execute(
      `SELECT la.max_grade AS maxGrade, la.midterm_no AS midtermNo,
              la.subject_group_offering_id AS offeringId
       FROM lab_assignments la
       JOIN student_subject_enrollments sse
         ON sse.id = ? AND sse.subject_group_offering_id = la.subject_group_offering_id
       JOIN teacher_subject_assignments tsa
         ON tsa.subject_group_offering_id = la.subject_group_offering_id
        AND tsa.lab_group_id = sse.lab_group_id AND tsa.teacher_id = ?
       WHERE la.id = ? FOR UPDATE`,
      [enrollmentId, teacherId, labId]
    );
    if (!rows.length) {
      await connection.rollback();
      return response.status(404).json({ error: "Lab or enrollment is not assigned to you." });
    }
    if (grade !== null && grade > Number(rows[0].maxGrade)) {
      await connection.rollback();
      return response.status(400).json({ error: `Grade cannot exceed ${rows[0].maxGrade}.` });
    }
    const [midterms] = await connection.execute(
      "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE",
      [rows[0].offeringId, rows[0].midtermNo]
    );
    if (midterms[0]?.status !== "OPEN") {
      await connection.rollback();
      return response.status(409).json({ error: "This midterm is locked." });
    }
    await connection.execute(
      `INSERT INTO student_lab_results (lab_assignment_id, student_subject_enrollment_id, attendance, grade)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE attendance = VALUES(attendance), grade = VALUES(grade)`,
      [labId, enrollmentId, attendance, grade]
    );
    await connection.commit();
    return response.json({ success: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.put("/teacher/exam-results", requireRole("teacher"), async (request, response) => {
  const enrollmentId = toId(request.body.enrollmentId);
  const midtermNo = Number(request.body.midtermNo);
  const score = request.body.score === null ? null : Number(request.body.score);
  if (!enrollmentId || ![1, 2].includes(midtermNo) ||
      (score !== null && (!Number.isInteger(score) || score < 0 || score > 4))) {
    return response.status(400).json({ error: "Exam score must be a whole number from 0 to 4." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacherId = await getTeacherId(connection, request.user.id);
    const [rows] = await connection.execute(
      `SELECT sse.subject_group_offering_id AS offeringId
       FROM student_subject_enrollments sse
       JOIN teacher_subject_assignments tsa
         ON tsa.subject_group_offering_id = sse.subject_group_offering_id
        AND tsa.lab_group_id = sse.lab_group_id AND tsa.teacher_id = ?
       WHERE sse.id = ? FOR UPDATE`,
      [teacherId, enrollmentId]
    );
    if (!rows.length) {
      await connection.rollback();
      return response.status(404).json({ error: "Enrollment is not assigned to you." });
    }
    const offeringId = rows[0].offeringId;
    const [midterms] = await connection.execute(
      "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE",
      [offeringId, midtermNo]
    );
    if (!midterms.length || midterms[0].status !== "OPEN") {
      await connection.rollback();
      return response.status(409).json({ error: "This midterm is locked." });
    }
    await connection.execute(
      `INSERT INTO student_midterm_results (student_subject_enrollment_id, midterm_no, exam_score)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE exam_score = VALUES(exam_score)`,
      [enrollmentId, midtermNo, score]
    );
    await connection.commit();
    return response.json({ success: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

router.post("/teacher/offerings/:offeringId/midterms/:midtermNo/lock", requireRole("teacher"), async (request, response) => {
  const offeringId = toId(request.params.offeringId);
  const midtermNo = Number(request.params.midtermNo);
  if (!offeringId || ![1, 2].includes(midtermNo)) {
    return response.status(400).json({ error: "Choose a valid offering and midterm." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const teacherId = await getTeacherId(connection, request.user.id);
    const [assignments] = await connection.execute(
      "SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_group_offering_id = ? LIMIT 1",
      [teacherId, offeringId]
    );
    if (!assignments.length) {
      await connection.rollback();
      return response.status(403).json({ error: "You are not assigned to this offering." });
    }
    const [midterms] = await connection.execute(
      "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? AND midterm_no = ? FOR UPDATE",
      [offeringId, midtermNo]
    );
    if (!midterms.length || midterms[0].status !== "OPEN") {
      await connection.rollback();
      return response.status(409).json({ error: "This midterm is already locked or unavailable." });
    }
    if (midtermNo === 2) {
      const [firstMidterm] = await connection.execute(
        "SELECT status FROM offering_midterms WHERE subject_group_offering_id = ? AND midterm_no = 1",
        [offeringId]
      );
      if (firstMidterm[0]?.status !== "LOCKED") {
        await connection.rollback();
        return response.status(409).json({ error: "Lock the first midterm before locking the second." });
      }
    }
    const [labs] = await connection.execute(
      `SELECT id, max_grade AS maxGrade FROM lab_assignments
       WHERE subject_group_offering_id = ? AND midterm_no = ?`,
      [offeringId, midtermNo]
    );
    if (!labs.length || labs.reduce((sum, lab) => sum + Number(lab.maxGrade), 0) !== 16) {
      await connection.rollback();
      return response.status(409).json({ error: "Midterm labs must total exactly 16 points before locking." });
    }
    const [incomplete] = await connection.execute(
      `SELECT COUNT(*) AS count
       FROM student_subject_enrollments sse
       LEFT JOIN student_midterm_results smr
         ON smr.student_subject_enrollment_id = sse.id AND smr.midterm_no = ?
       WHERE sse.subject_group_offering_id = ? AND (
         smr.exam_score IS NULL OR EXISTS (
           SELECT 1 FROM lab_assignments la
           LEFT JOIN student_lab_results slr
             ON slr.lab_assignment_id = la.id
            AND slr.student_subject_enrollment_id = sse.id
           WHERE la.subject_group_offering_id = ? AND la.midterm_no = ?
             AND (slr.grade IS NULL OR slr.attendance = 'UNMARKED')
         )
       )`,
      [midtermNo, offeringId, offeringId, midtermNo]
    );
    if (Number(incomplete[0].count) > 0) {
      await connection.rollback();
      return response.status(409).json({ error: `Complete grades, attendance, and exam scores for ${incomplete[0].count} student(s) before locking.` });
    }
    await connection.execute(
      `UPDATE offering_midterms SET status = 'LOCKED', locked_at = UTC_TIMESTAMP(),
       locked_by_teacher_id = ? WHERE subject_group_offering_id = ? AND midterm_no = ?`,
      [teacherId, offeringId, midtermNo]
    );
    await connection.commit();
    return response.json({ success: true });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export default router;
