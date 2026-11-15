import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { requireRole, adminScope } from '../access.js';
import {
  ApiError,
  asyncRoute,
  idParam,
  requireRecord,
  validate,
} from '../http.js';
import { reconcilePlacement } from '../services/placement.js';
export const catalogRouter = Router();
const name = z.string().trim().min(1).max(255),
  code = z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/),
  id = z.number().int().positive();
const catalogs = {
  units: {
    table: 'academic_units',
    schema: z.strictObject({
      code,
      name,
      unitType: z.enum(['INSTITUTE', 'FACULTY']),
    }),
    columns: { code: 'code', name: 'name', unitType: 'unit_type' },
    children: [
      ['specializations', 'academic_unit_id'],
      ['admins', 'academic_unit_id'],
    ],
  },
  specializations: {
    table: 'specializations',
    schema: z.strictObject({ code, name, academicUnitId: id }),
    columns: { code: 'code', name: 'name', academicUnitId: 'academic_unit_id' },
    children: [['academic_groups', 'specialization_id']],
  },
  groups: {
    table: 'academic_groups',
    schema: z.strictObject({
      code: code.regex(/^[A-Za-z]+[0-9]+$/),
      name,
      specializationId: id,
    }),
    columns: {
      code: 'code',
      name: 'name',
      specializationId: 'specialization_id',
    },
    children: [
      ['students', 'academic_group_id'],
      ['subject_group_offerings', 'academic_group_id'],
      ['lab_groups', 'academic_group_id'],
    ],
  },
  'lab-groups': {
    table: 'lab_groups',
    schema: z.strictObject({ code, academicGroupId: id }),
    columns: { code: 'code', academicGroupId: 'academic_group_id' },
    children: [
      ['teacher_subject_assignments', 'lab_group_id'],
      ['student_subject_enrollments', 'lab_group_id'],
      ['student_subject_enrollments', 'default_lab_group_id'],
      ['lab_change_requests', 'current_lab_group_id'],
      ['lab_change_requests', 'requested_lab_group_id'],
    ],
  },
  subjects: {
    table: 'subjects',
    schema: z.strictObject({ code, name }),
    columns: { code: 'code', name: 'name' },
    children: [['subject_group_offerings', 'subject_id']],
  },
};
function definition(type) {
  return requireRecord(
    Object.hasOwn(catalogs, type) ? catalogs[type] : null,
    'Catalog not found.',
  );
}
function superAdmin(req, _res, next) {
  if (req.user.adminLevel !== 'SUPER_ADMIN')
    return next(
      new ApiError(
        403,
        'FORBIDDEN',
        'Academic configuration requires a super administrator.',
      ),
    );
  next();
}
catalogRouter.use('/admin/catalog', requireRole('admin'), superAdmin);
catalogRouter.get(
  '/admin/catalog/:type',
  asyncRoute(async (req, res) => {
    const d = definition(req.params.type);
    res.json(
      await query(
        `SELECT id,${Object.entries(d.columns)
          .map(([key, column]) => `${column} AS ${key}`)
          .join(',')} FROM ${d.table} ORDER BY code`,
      ),
    );
  }),
);
async function unused(c, d, id) {
  for (const [table, column] of d.children) {
    const [rows] = await c.execute(
      `SELECT COUNT(*) AS n FROM ${table} WHERE ${column}=?`,
      [id],
    );
    if (rows[0].n)
      throw new ApiError(
        409,
        'IN_USE',
        `This record is referenced by ${rows[0].n} ${table} records. Its relationships and history must be retained.`,
      );
  }
}
catalogRouter.post(
  '/admin/catalog/:type',
  asyncRoute(async (req, res) => {
    const d = definition(req.params.type),
      data = validate(d.schema, req.body),
      keys = Object.keys(d.columns);
    const result = await query(
      `INSERT INTO ${d.table} (${keys.map((k) => d.columns[k]).join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
      keys.map((k) => data[k]),
    );
    res.status(201).json({ id: result.insertId, ...data });
  }),
);
catalogRouter.patch(
  '/admin/catalog/:type/:id',
  asyncRoute(async (req, res) => {
    const d = definition(req.params.type),
      data = validate(d.schema, req.body),
      recordId = idParam(req.params.id),
      keys = Object.keys(d.columns);
    await transaction(async (c) => {
      const [rows] = await c.execute(
        `SELECT * FROM ${d.table} WHERE id=? FOR UPDATE`,
        [recordId],
      );
      const current = requireRecord(rows[0]);
      // A parent move or group code change could invalidate email identity or enrollment relationships.
      if (
        keys.some(
          (k) => k.endsWith('Id') && data[k] !== current[d.columns[k]],
        ) ||
        (req.params.type === 'groups' &&
          data.code.toUpperCase() !== current.code.toUpperCase())
      )
        await unused(c, d, recordId);
      await c.execute(
        `UPDATE ${d.table} SET ${keys.map((k) => `${d.columns[k]}=?`).join(',')} WHERE id=?`,
        [...keys.map((k) => data[k]), recordId],
      );
    });
    res.json({ id: recordId, ...data });
  }),
);
catalogRouter.delete(
  '/admin/catalog/:type/:id',
  asyncRoute(async (req, res) => {
    const d = definition(req.params.type),
      recordId = idParam(req.params.id);
    await transaction(async (c) => {
      const [rows] = await c.execute(
        `SELECT id FROM ${d.table} WHERE id=? FOR UPDATE`,
        [recordId],
      );
      requireRecord(rows[0]);
      await unused(c, d, recordId);
      await c.execute(`DELETE FROM ${d.table} WHERE id=?`, [recordId]);
    });
    res.status(204).end();
  }),
);
catalogRouter.post(
  '/admin/academic-groups/:id/reconcile',
  requireRole('admin'),
  asyncRoute(async (req, res) => {
    const groupId = idParam(req.params.id);
    const result = await transaction(async (c) => {
      const [groups] = await c.execute(
        'SELECT sp.academic_unit_id AS unitId FROM academic_groups ag JOIN specializations sp ON sp.id=ag.specialization_id WHERE ag.id=? FOR UPDATE',
        [groupId],
      );
      adminScope(req.user, requireRecord(groups[0]).unitId);
      return reconcilePlacement(c, groupId);
    });
    res.json({
      ...result,
      message:
        'Missing cohort enrollments reconciled. Existing placements and approved exceptions preserved.',
    });
  }),
);
