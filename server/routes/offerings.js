import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { adminScope, offeringAccess, requireRole } from '../access.js';
import { ApiError, asyncRoute, idParam, requireRecord, validate } from '../http.js';
import { ensureLabGroups, neededLabGroups, placeStudents } from '../services/placement.js';

export const offeringRouter = Router();
const offeringInput = z.strictObject({
  subjectId: z.number().int().positive(),
  academicGroupId: z.number().int().positive(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
  semester: z.enum(['Fall', 'Spring']),
});
const coverageInput = z.strictObject({
  teacherId: z.number().int().positive(),
  mode: z.enum(['all', 'split']),
  labGroupIds: z.array(z.number().int().positive()).optional(),
});

const offeringSelect = `SELECT sgo.id, sgo.subject_id AS subjectId, s.code AS subjectCode,
  s.name AS subjectName, sgo.academic_group_id AS academicGroupId,
  ag.code AS academicGroupCode, sgo.academic_year AS academicYear,
  sgo.semester, sgo.is_active AS isActive, sgo.total_grade AS totalGrade,
  sp.academic_unit_id AS academicUnitId
  FROM subject_group_offerings sgo JOIN subjects s ON s.id = sgo.subject_id
  JOIN academic_groups ag ON ag.id = sgo.academic_group_id
  JOIN specializations sp ON sp.id = ag.specialization_id`;

offeringRouter.get('/offerings', asyncRoute(async (req, res) => {
  let where = '';
  const params = [];
  if (req.user.role === 'admin' && req.user.adminLevel !== 'SUPER_ADMIN') {
    where = ' WHERE sp.academic_unit_id = ?'; params.push(req.user.academicUnitId);
  } else if (req.user.role === 'teacher') {
    where = ' WHERE EXISTS (SELECT 1 FROM teacher_subject_assignments tsa WHERE tsa.subject_group_offering_id = sgo.id AND tsa.teacher_id = ?)';
    params.push(req.user.profileId);
  } else if (req.user.role === 'student') {
    where = ' WHERE EXISTS (SELECT 1 FROM student_subject_enrollments sse WHERE sse.subject_group_offering_id = sgo.id AND sse.student_id = ?)';
    params.push(req.user.profileId);
  }
  res.json(await query(`${offeringSelect}${where} ORDER BY sgo.academic_year DESC, sgo.semester, ag.code, s.name`, params));
}));

offeringRouter.post('/offerings', requireRole('admin'), asyncRoute(async (req, res) => {
  const data = validate(offeringInput, req.body);
  const created = await transaction(async (connection) => {
    const [groups] = await connection.execute(`SELECT ag.id, ag.code, sp.academic_unit_id AS academicUnitId
      FROM academic_groups ag JOIN specializations sp ON sp.id = ag.specialization_id
      WHERE ag.id = ? FOR UPDATE`, [data.academicGroupId]);
    const group = requireRecord(groups[0], 'Academic group not found.');
    adminScope(req.user, group.academicUnitId);
    const [subjects] = await connection.execute('SELECT id FROM subjects WHERE id = ?', [data.subjectId]);
    requireRecord(subjects[0], 'Subject not found.');
    const [students] = await connection.execute(`SELECT id, first_name AS firstName, last_name AS lastName
      FROM students WHERE academic_group_id = ? ORDER BY id FOR UPDATE`, [group.id]);
    const labs = await ensureLabGroups(connection, group, neededLabGroups(students.length));
    const [insert] = await connection.execute(`INSERT INTO subject_group_offerings
      (subject_id, academic_group_id, academic_year, semester) VALUES (?, ?, ?, ?)`,
      [data.subjectId, group.id, data.academicYear, data.semester]);
    const offeringId = insert.insertId;
    await connection.execute(`INSERT INTO offering_midterms (subject_group_offering_id, midterm_no)
      VALUES (?, 1), (?, 2)`, [offeringId, offeringId]);
    for (const placement of placeStudents(students, labs)) {
      await connection.execute(`INSERT INTO student_subject_enrollments
        (student_id, subject_group_offering_id, lab_group_id, default_lab_group_id)
        VALUES (?, ?, ?, ?)`, [placement.studentId, offeringId, placement.labGroupId, placement.labGroupId]);
    }
    return offeringId;
  });
  const rows = await query(`${offeringSelect} WHERE sgo.id = ?`, [created]);
  res.status(201).json(rows[0]);
}));

offeringRouter.patch('/offerings/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const id = idParam(req.params.id);
  const data = validate(z.strictObject({ isActive: z.boolean() }), req.body);
  const offering = await offeringAccess(req.user, id);
  adminScope(req.user, offering.academicUnitId);
  await query('UPDATE subject_group_offerings SET is_active = ? WHERE id = ?', [data.isActive, id]);
  res.json({ ...offering, isActive: data.isActive });
}));

offeringRouter.get('/offerings/:id/enrollments', asyncRoute(async (req, res) => {
  const id = idParam(req.params.id);
  await offeringAccess(req.user, id);
  let where = '';
  const params = [id];
  if (req.user.role === 'student') { where = ' AND sse.student_id = ?'; params.push(req.user.profileId); }
  res.json(await query(`SELECT sse.id, sse.student_id AS studentId,
    s.first_name AS firstName, s.last_name AS lastName,
    sse.subject_group_offering_id AS offeringId, sse.lab_group_id AS labGroupId,
    sse.default_lab_group_id AS defaultLabGroupId
    FROM student_subject_enrollments sse JOIN students s ON s.id = sse.student_id
    WHERE sse.subject_group_offering_id = ?${where} ORDER BY s.last_name, s.first_name`, params));
}));

offeringRouter.get('/offerings/:id/coverage', asyncRoute(async (req, res) => {
  const id = idParam(req.params.id);
  await offeringAccess(req.user, id);
  const rows = await query(`SELECT tsa.id, tsa.teacher_id AS teacherId,
    tsa.lab_group_id AS labGroupId, t.first_name AS firstName, t.last_name AS lastName
    FROM teacher_subject_assignments tsa JOIN teachers t ON t.id = tsa.teacher_id
    WHERE tsa.subject_group_offering_id = ? ORDER BY tsa.lab_group_id`, [id]);
  res.json(rows);
}));

offeringRouter.put('/offerings/:id/coverage', requireRole('admin'), asyncRoute(async (req, res) => {
  const offeringId = idParam(req.params.id);
  const data = validate(coverageInput, req.body);
  const result = await transaction(async (connection) => {
    const [offerings] = await connection.execute(`SELECT sgo.id, sgo.academic_group_id AS academicGroupId,
      sp.academic_unit_id AS academicUnitId FROM subject_group_offerings sgo
      JOIN academic_groups ag ON ag.id = sgo.academic_group_id
      JOIN specializations sp ON sp.id = ag.specialization_id WHERE sgo.id = ? FOR UPDATE`, [offeringId]);
    const offering = requireRecord(offerings[0], 'Offering not found.');
    adminScope(req.user, offering.academicUnitId);
    const [teachers] = await connection.execute(`SELECT t.id FROM teachers t JOIN user_accounts ua ON ua.id = t.user_account_id
      WHERE t.id = ? AND ua.is_active = TRUE AND ua.approval_status = 'APPROVED'`, [data.teacherId]);
    requireRecord(teachers[0], 'Active teacher not found.');
    const [labs] = await connection.execute('SELECT id FROM lab_groups WHERE academic_group_id = ? ORDER BY id', [offering.academicGroupId]);
    const allIds = labs.map((lab) => lab.id);
    const target = data.mode === 'all' ? allIds : [...new Set(data.labGroupIds || [])];
    if (!target.length || target.some((id) => !allIds.includes(id))) {
      throw new ApiError(400, 'INVALID_LAB_GROUP', 'Choose lab groups in the offering academic group.');
    }
    for (const labId of target) {
      await connection.execute('DELETE FROM teacher_subject_assignments WHERE subject_group_offering_id = ? AND lab_group_id = ?', [offeringId, labId]);
      await connection.execute('INSERT INTO teacher_subject_assignments (teacher_id, subject_group_offering_id, lab_group_id) VALUES (?, ?, ?)', [data.teacherId, offeringId, labId]);
    }
    return target.length;
  });
  res.json({ assignedCount: result });
}));
