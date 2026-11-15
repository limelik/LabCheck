import { query } from './db.js';
import { ApiError, requireRecord } from './http.js';

export function requireRole(...roles) {
  return (req, _res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(
          new ApiError(
            403,
            'FORBIDDEN',
            'You do not have access to this operation.',
          ),
        );
}

export async function offeringAccess(user, offeringId) {
  const rows = await query(
    `
    SELECT sgo.id, sgo.subject_id AS subjectId, sgo.academic_group_id AS academicGroupId,
      sgo.academic_year AS academicYear, sgo.semester, sgo.is_active AS isActive,
      sp.academic_unit_id AS academicUnitId
    FROM subject_group_offerings sgo
    JOIN academic_groups ag ON ag.id = sgo.academic_group_id
    JOIN specializations sp ON sp.id = ag.specialization_id
    WHERE sgo.id = ?`,
    [offeringId],
  );
  const offering = requireRecord(rows[0], 'Offering not found.');
  if (
    user.role === 'admin' &&
    (user.adminLevel === 'SUPER_ADMIN' ||
      user.academicUnitId === offering.academicUnitId)
  )
    return offering;
  if (user.role === 'teacher') {
    const matches = await query(
      'SELECT 1 FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_group_offering_id = ? LIMIT 1',
      [user.profileId, offeringId],
    );
    if (matches.length) return offering;
  }
  if (user.role === 'student') {
    const matches = await query(
      'SELECT 1 FROM student_subject_enrollments WHERE student_id = ? AND subject_group_offering_id = ? LIMIT 1',
      [user.profileId, offeringId],
    );
    if (matches.length) return offering;
  }
  throw new ApiError(
    403,
    'FORBIDDEN',
    'You do not have access to this offering.',
  );
}

export function adminScope(user, academicUnitId) {
  if (
    user.adminLevel !== 'SUPER_ADMIN' &&
    user.academicUnitId !== academicUnitId
  ) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'This academic unit is outside your scope.',
    );
  }
}

// Serialize teaching writes with coverage changes, placement, and midterm locking.
export async function lockTeachingOffering(connection, user, offeringId) {
  const [offerings] = await connection.execute(
    'SELECT id FROM subject_group_offerings WHERE id = ? FOR UPDATE',
    [offeringId],
  );
  requireRecord(offerings[0], 'Offering not found.');
  const [assignments] = await connection.execute(
    'SELECT id FROM teacher_subject_assignments WHERE subject_group_offering_id = ? AND teacher_id = ? FOR UPDATE',
    [offeringId, user.profileId],
  );
  if (!assignments.length)
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Teaching coverage has changed. Reload your assignments.',
    );
}
