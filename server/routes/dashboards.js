import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute, idParam } from '../http.js';
import { requireRole } from '../access.js';

export const dashboardRouter = Router();

dashboardRouter.get('/students/me/enrollments', requireRole('student'), asyncRoute(async (req, res) => {
  const rows = await query(`SELECT sse.id, sse.subject_group_offering_id AS offeringId,
    sse.lab_group_id AS labGroupId, lg.code AS labGroupCode,
    sse.default_lab_group_id AS defaultLabGroupId,
    sgo.academic_year AS academicYear, sgo.semester, sgo.is_active AS isActive,
    sgo.academic_group_id AS academicGroupId, ag.code AS academicGroupCode,
    sub.id AS subjectId, sub.code AS subjectCode, sub.name AS subjectName
    FROM student_subject_enrollments sse
    JOIN subject_group_offerings sgo ON sgo.id = sse.subject_group_offering_id
    JOIN subjects sub ON sub.id = sgo.subject_id
    JOIN academic_groups ag ON ag.id = sgo.academic_group_id
    JOIN lab_groups lg ON lg.id = sse.lab_group_id
    WHERE sse.student_id = ? ORDER BY sub.name, sgo.academic_year DESC`, [req.user.profileId]);
  res.json(rows);
}));

dashboardRouter.get('/students/me/progress', requireRole('student'), asyncRoute(async (req, res) => {
  const [progress, results] = await Promise.all([
    query(`SELECT p.student_subject_enrollment_id AS enrollmentId, p.midterm_no AS midtermNo,
      p.lab_count AS labCount, p.absences, p.lab_points AS labPoints,
      p.exam_points AS examScore, p.overall_points AS overallPoints, p.eligibility,
      om.status, sse.subject_group_offering_id AS offeringId
      FROM student_midterm_progress p
      JOIN student_subject_enrollments sse ON sse.id = p.student_subject_enrollment_id
      JOIN offering_midterms om ON om.subject_group_offering_id = sse.subject_group_offering_id
        AND om.midterm_no = p.midterm_no
      WHERE sse.student_id = ? ORDER BY sse.id, p.midterm_no`, [req.user.profileId]),
    query(`SELECT sse.id AS enrollmentId, la.id AS labId, la.midterm_no AS midtermNo,
      la.lab_number AS labNumber, la.title, la.description,
      la.max_grade AS difficulty, slr.grade, COALESCE(slr.attendance, 'UNMARKED') AS attendance
      FROM student_subject_enrollments sse
      JOIN lab_assignments la ON la.subject_group_offering_id = sse.subject_group_offering_id
      LEFT JOIN student_lab_results slr ON slr.lab_assignment_id = la.id
        AND slr.student_subject_enrollment_id = sse.id
      WHERE sse.student_id = ? ORDER BY sse.id, la.lab_number`, [req.user.profileId]),
  ]);
  res.json(progress.map((row) => ({ ...row,
    labs: results.filter((lab) => lab.enrollmentId === row.enrollmentId && lab.midtermNo === row.midtermNo),
  })));
}));

dashboardRouter.get('/teachers/me/assignments', requireRole('teacher'), asyncRoute(async (req, res) => {
  res.json(await query(`SELECT tsa.id, tsa.subject_group_offering_id AS offeringId,
    tsa.lab_group_id AS labGroupId, lg.code AS labGroupCode,
    sgo.academic_group_id AS academicGroupId, ag.code AS academicGroupCode,
    sgo.academic_year AS academicYear, sgo.semester,
    sub.id AS subjectId, sub.code AS subjectCode, sub.name AS subjectName
    FROM teacher_subject_assignments tsa
    JOIN subject_group_offerings sgo ON sgo.id = tsa.subject_group_offering_id
    JOIN academic_groups ag ON ag.id = sgo.academic_group_id
    JOIN lab_groups lg ON lg.id = tsa.lab_group_id
    JOIN subjects sub ON sub.id = sgo.subject_id
    WHERE tsa.teacher_id = ? ORDER BY sub.name, ag.code, lg.code`, [req.user.profileId]));
}));

dashboardRouter.get('/admin/dashboard', requireRole('admin'), asyncRoute(async (req, res) => {
  const scope = req.user.adminLevel === 'SUPER_ADMIN' ? null : req.user.academicUnitId;
  const [counts, offerings] = await Promise.all([
    query(`SELECT
      (SELECT COUNT(*) FROM academic_units WHERE (? IS NULL OR id = ?)) AS units,
      (SELECT COUNT(*) FROM specializations WHERE (? IS NULL OR academic_unit_id = ?)) AS specializations,
      (SELECT COUNT(*) FROM academic_groups ag JOIN specializations sp ON sp.id = ag.specialization_id WHERE (? IS NULL OR sp.academic_unit_id = ?)) AS academicGroups`,
    [scope, scope, scope, scope, scope, scope]),
    query(`SELECT sgo.id, sgo.is_active AS isActive,
      COUNT(DISTINCT sse.id) AS enrollmentCount,
      COUNT(DISTINCT CASE WHEN sse.lab_group_id <> sse.default_lab_group_id THEN sse.id END) AS exceptionCount,
      COUNT(DISTINCT CASE WHEN lcr.status = 'PENDING' THEN lcr.id END) AS pendingRequestCount
      FROM subject_group_offerings sgo
      JOIN academic_groups ag ON ag.id = sgo.academic_group_id
      JOIN specializations sp ON sp.id = ag.specialization_id
      LEFT JOIN student_subject_enrollments sse ON sse.subject_group_offering_id = sgo.id
      LEFT JOIN lab_change_requests lcr ON lcr.student_subject_enrollment_id = sse.id
      WHERE (? IS NULL OR sp.academic_unit_id = ?)
      GROUP BY sgo.id ORDER BY sgo.id`, [scope, scope]),
  ]);
  res.json({ ...counts[0], offerings: offerings.length,
    activeOfferings: offerings.filter((offering) => offering.isActive).length,
    enrollments: offerings.reduce((sum, offering) => sum + offering.enrollmentCount, 0),
    pendingRequests: offerings.reduce((sum, offering) => sum + offering.pendingRequestCount, 0),
    offeringSummaries: offerings,
  });
}));

dashboardRouter.get('/academic-groups/:id/lab-groups', asyncRoute(async (req, res) => {
  const id = idParam(req.params.id);
  res.json(await query('SELECT id, academic_group_id AS academicGroupId, code FROM lab_groups WHERE academic_group_id = ? ORDER BY code', [id]));
}));
