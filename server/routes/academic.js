import { Router } from 'express';
import { query } from '../db.js';
import { asyncRoute } from '../http.js';
import { requireRole } from '../access.js';

export const academicRouter = Router();

academicRouter.get('/academic-structure', asyncRoute(async (req, res) => {
  const [units, specializations, groups, labGroups] = await Promise.all([
    query('SELECT id, code, name, unit_type AS unitType FROM academic_units ORDER BY name'),
    query('SELECT id, academic_unit_id AS academicUnitId, code, name FROM specializations ORDER BY name'),
    query(`SELECT ag.id, ag.specialization_id AS specializationId, ag.code, ag.name,
      COUNT(s.id) AS studentCount
      FROM academic_groups ag LEFT JOIN students s ON s.academic_group_id = ag.id
      GROUP BY ag.id ORDER BY ag.code`),
    query('SELECT id, academic_group_id AS academicGroupId, code FROM lab_groups ORDER BY code'),
  ]);
  const visibleUnits = req.user.role === 'admin' && req.user.adminLevel !== 'SUPER_ADMIN'
    ? units.filter((unit) => unit.id === req.user.academicUnitId) : units;
  const visibleUnitIds = new Set(visibleUnits.map((unit) => unit.id));
  const visibleSpecializations = specializations.filter((item) => visibleUnitIds.has(item.academicUnitId));
  const visibleSpecializationIds = new Set(visibleSpecializations.map((item) => item.id));
  const visibleGroups = groups.filter((group) => visibleSpecializationIds.has(group.specializationId));
  const visibleGroupIds = new Set(visibleGroups.map((group) => group.id));
  res.json({ units: visibleUnits, specializations: visibleSpecializations, groups: visibleGroups.map((group) => ({
    ...group, recommendedLabCount: Math.ceil(group.studentCount / 16),
    labGroupIds: labGroups.filter((lab) => lab.academicGroupId === group.id).map((lab) => lab.id),
  })), labGroups: labGroups.filter((lab) => visibleGroupIds.has(lab.academicGroupId)) });
}));

academicRouter.get('/subjects', asyncRoute(async (_req, res) => {
  res.json(await query('SELECT id, code, name FROM subjects ORDER BY name'));
}));

academicRouter.get('/teachers', requireRole('admin'), asyncRoute(async (_req, res) => {
  res.json(await query(`SELECT t.id, t.first_name AS firstName, t.last_name AS lastName,
    ua.email FROM teachers t JOIN user_accounts ua ON ua.id = t.user_account_id
    WHERE ua.is_active = TRUE AND ua.approval_status = 'APPROVED' ORDER BY t.last_name, t.first_name`));
}));
