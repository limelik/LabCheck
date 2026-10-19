import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { offeringAccess, requireRole } from '../access.js';
import { ApiError, asyncRoute, idParam, requireRecord, validate } from '../http.js';

export const requestRouter = Router();
const requestSelect = `SELECT lcr.id, lcr.student_subject_enrollment_id AS enrollmentId,
  sse.subject_group_offering_id AS offeringId, sse.student_id AS studentId,
  s.first_name AS firstName, s.last_name AS lastName,
  lcr.current_lab_group_id AS currentLabGroupId,
  lcr.requested_lab_group_id AS requestedLabGroupId,
  lcr.status, lcr.requested_at AS requestedAt, lcr.decided_at AS decidedAt,
  lcr.decided_by_teacher_id AS decidedByTeacherId
  FROM lab_change_requests lcr
  JOIN student_subject_enrollments sse ON sse.id = lcr.student_subject_enrollment_id
  JOIN students s ON s.id = sse.student_id
  JOIN subject_group_offerings sgo ON sgo.id = sse.subject_group_offering_id
  JOIN academic_groups ag ON ag.id = sgo.academic_group_id
  JOIN specializations sp ON sp.id = ag.specialization_id`;

requestRouter.get('/lab-change-requests', asyncRoute(async (req, res) => {
  const status = req.query.status;
  if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, 'INVALID_STATUS', 'Invalid request status.');
  }
  const conditions = [];
  const params = [];
  if (req.user.role === 'student') { conditions.push('sse.student_id = ?'); params.push(req.user.profileId); }
  if (req.user.role === 'teacher') {
    conditions.push(`EXISTS (SELECT 1 FROM teacher_subject_assignments tsa
      WHERE tsa.subject_group_offering_id = sgo.id AND tsa.teacher_id = ?)`);
    params.push(req.user.profileId);
  }
  if (req.user.role === 'admin' && req.user.adminLevel !== 'SUPER_ADMIN') {
    conditions.push('sp.academic_unit_id = ?'); params.push(req.user.academicUnitId);
  }
  if (status) { conditions.push('lcr.status = ?'); params.push(status); }
  if (req.query.offeringId) { conditions.push('sgo.id = ?'); params.push(idParam(req.query.offeringId)); }
  res.json(await query(`${requestSelect}${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY lcr.requested_at DESC, lcr.id DESC`, params));
}));

requestRouter.post('/enrollments/:id/lab-change-requests', requireRole('student'), asyncRoute(async (req, res) => {
  const enrollmentId = idParam(req.params.id);
  const { requestedLabGroupId } = validate(z.strictObject({ requestedLabGroupId: z.number().int().positive() }), req.body);
  const id = await transaction(async (connection) => {
    const [rows] = await connection.execute(`SELECT sse.id, sse.lab_group_id AS labGroupId,
      sse.subject_group_offering_id AS offeringId FROM student_subject_enrollments sse
      WHERE sse.id = ? AND sse.student_id = ? FOR UPDATE`, [enrollmentId, req.user.profileId]);
    const enrollment = requireRecord(rows[0], 'Your enrollment was not found.');
    if (enrollment.labGroupId === requestedLabGroupId) throw new ApiError(400, 'SAME_LAB_GROUP', 'Choose a different lab group.');
    const [insert] = await connection.execute(`INSERT INTO lab_change_requests
      (student_subject_enrollment_id, current_lab_group_id, requested_lab_group_id)
      VALUES (?, ?, ?)`, [enrollmentId, enrollment.labGroupId, requestedLabGroupId]);
    return insert.insertId;
  });
  const rows = await query(`${requestSelect} WHERE lcr.id = ?`, [id]);
  res.status(201).json(rows[0]);
}));

requestRouter.patch('/lab-change-requests/:id', requireRole('teacher'), asyncRoute(async (req, res) => {
  const id = idParam(req.params.id);
  const { decision } = validate(z.strictObject({ decision: z.enum(['APPROVED', 'REJECTED']) }), req.body);
  const offeringRows = await query(`SELECT sse.subject_group_offering_id AS offeringId
    FROM lab_change_requests lcr JOIN student_subject_enrollments sse
    ON sse.id = lcr.student_subject_enrollment_id WHERE lcr.id = ?`, [id]);
  const offeringId = requireRecord(offeringRows[0], 'Request not found.').offeringId;
  await offeringAccess(req.user, offeringId);
  await transaction(async (connection) => {
    const [rows] = await connection.execute(`SELECT lcr.status, lcr.requested_lab_group_id AS targetId,
      sse.id AS enrollmentId, sse.lab_group_id AS currentId
      FROM lab_change_requests lcr JOIN student_subject_enrollments sse
      ON sse.id = lcr.student_subject_enrollment_id WHERE lcr.id = ? FOR UPDATE`, [id]);
    const request = requireRecord(rows[0], 'Request not found.');
    if (request.status !== 'PENDING') throw new ApiError(409, 'ALREADY_DECIDED', 'This request has already been decided.');
    if (decision === 'APPROVED') {
      const [target] = await connection.execute('SELECT id FROM lab_groups WHERE id = ? FOR UPDATE', [request.targetId]);
      requireRecord(target[0], 'Requested lab group not found.');
      const [counts] = await connection.execute(`SELECT COUNT(*) AS count FROM student_subject_enrollments
        WHERE subject_group_offering_id = ? AND lab_group_id = ?`, [offeringId, request.targetId]);
      if (counts[0].count >= 16) throw new ApiError(409, 'LAB_GROUP_FULL', 'Requested lab group is full.');
    }
    await connection.execute(`UPDATE lab_change_requests SET status = ?, decided_at = UTC_TIMESTAMP(),
      decided_by_teacher_id = ? WHERE id = ?`, [decision, req.user.profileId, id]);
  });
  const rows = await query(`${requestSelect} WHERE lcr.id = ?`, [id]);
  res.json(rows[0]);
}));
