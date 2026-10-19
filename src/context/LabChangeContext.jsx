import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const LabChangeContext = createContext(null);
const byId = (rows) => Object.fromEntries(rows.map((row) => [row.id, row]));

export function LabChangeProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState({
    academicUnits: [], specializations: [], academicGroups: [], labGroups: [],
    subjectCatalog: [], offerings: [], teachers: [], teacherAssignments: [],
    enrollments: [], labChangeRequests: [], dashboard: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedForUser, setLoadedForUser] = useState(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const [structure, subjects, offerings, requests] = await Promise.all([
        api('/academic-structure'), api('/subjects'), api('/offerings'), api('/lab-change-requests'),
      ]);
      const [teachers, dashboard, studentEnrollments, teacherAssignments] = await Promise.all([
        user.role === 'admin' ? api('/teachers') : Promise.resolve([]),
        user.role === 'admin' ? api('/admin/dashboard') : Promise.resolve(null),
        user.role === 'student' ? api('/students/me/enrollments') : Promise.resolve([]),
        user.role === 'teacher' ? api('/teachers/me/assignments') : Promise.resolve([]),
      ]);
      let enrollments = studentEnrollments.map((row) => ({
        id: row.id, studentId: user.profileId, subjectOfferingId: row.offeringId,
        labGroupId: row.labGroupId, defaultLabGroupId: row.defaultLabGroupId,
      }));
      let coverages = {};
      if (user.role === 'admin' || user.role === 'teacher') {
        const details = await Promise.all(offerings.map(async (offering) => ({
          id: offering.id,
          enrollments: await api(`/offerings/${offering.id}/enrollments`),
          coverage: user.role === 'admin' ? await api(`/offerings/${offering.id}/coverage`) : [],
        })));
        enrollments = details.flatMap((item) => item.enrollments.map((row) => ({
          ...row, subjectOfferingId: row.offeringId,
        })));
        coverages = Object.fromEntries(details.map((item) => [item.id, item.coverage]));
      }
      if (version === requestVersion.current) setData({
        academicUnits: structure.units,
        specializations: structure.specializations,
        academicGroups: structure.groups,
        labGroups: structure.labGroups,
        subjectCatalog: subjects,
        offerings: offerings.map((row) => ({ ...row, subjectId: row.subjectId, academicGroupId: row.academicGroupId })),
        teachers,
        teacherAssignments: teacherAssignments.map((row) => ({ ...row,
          teacherId: user.profileId, subjectOfferingId: row.offeringId,
        })),
        enrollments,
        labChangeRequests: requests.map((row) => ({ ...row,
          studentSubjectEnrollmentId: row.enrollmentId })),
        dashboard,
        coverages,
      });
    } catch (err) { if (version === requestVersion.current) setError(err.message); }
    finally { if (version === requestVersion.current) { setLoadedForUser(user); setLoading(false); } }
  }, [user]);

  useEffect(() => {
    const versions = requestVersion;
    refresh();
    return () => { versions.current++; };
  }, [refresh]);

  const value = useMemo(() => {
    const academicGroupsById = byId(data.academicGroups);
    const academicUnitsById = byId(data.academicUnits);
    const specializationsById = byId(data.specializations);
    const labGroupsById = byId(data.labGroups);
    const subjectsById = byId(data.subjectCatalog);
    const offeringsById = byId(data.offerings);
    const teachersById = byId(data.teachers);
    const studentsById = byId(data.enrollments.filter((row) => row.firstName).map((row) => ({
      id: row.studentId, firstName: row.firstName, lastName: row.lastName,
    })));
    if (user?.role === 'student') studentsById[user.profileId] = {
      id: user.profileId, firstName: user.firstName, lastName: user.lastName,
    };
    const getLabGroupsForAcademicGroup = (id) =>
      (academicGroupsById[id]?.labGroupIds || []).map((labId) => labGroupsById[labId]);
    const getRequestsForEnrollment = (id) => data.labChangeRequests
      .filter((request) => request.enrollmentId === id)
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    const getEnrichedEnrollment = (enrollment) => {
      const offering = offeringsById[enrollment.subjectOfferingId];
      if (!offering) return null;
      const student = studentsById[enrollment.studentId] || { id: enrollment.studentId, firstName: '', lastName: '' };
      const academicGroup = academicGroupsById[offering.academicGroupId];
      const specialization = specializationsById[academicGroup.specializationId];
      return {
        enrollment, offering, student,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        subject: subjectsById[offering.subjectId], academicGroup, specialization,
        academicUnit: academicUnitsById[specialization.academicUnitId],
        currentLabGroup: labGroupsById[enrollment.labGroupId],
        defaultLabGroup: labGroupsById[enrollment.defaultLabGroupId],
        labGroupOptions: getLabGroupsForAcademicGroup(academicGroup.id),
        requests: getRequestsForEnrollment(enrollment.id),
        latestRequest: getRequestsForEnrollment(enrollment.id)[0] || null,
        isException: enrollment.labGroupId !== enrollment.defaultLabGroupId,
      };
    };
    const getOfferingEnrollments = (id) => data.enrollments
      .filter((row) => row.subjectOfferingId === id).map(getEnrichedEnrollment).filter(Boolean);
    const getOfferingCoverage = (id) => {
      const offering = offeringsById[id];
      if (!offering) return null;
      const assignments = data.coverages?.[id] || [];
      const groupIds = academicGroupsById[offering.academicGroupId]?.labGroupIds || [];
      const coveredLabIds = assignments.map((row) => row.labGroupId);
      const uncoveredLabIds = groupIds.filter((labId) => !coveredLabIds.includes(labId));
      return { offering, coveredLabIds, uncoveredLabIds,
        teacherIds: [...new Set(assignments.map((row) => row.teacherId))],
        coveredCount: coveredLabIds.length, totalCount: groupIds.length,
        isFullyCovered: uncoveredLabIds.length === 0 };
    };
    const mutate = async (path, method, body) => {
      const result = await api(path, { method, body });
      await refresh();
      return result;
    };
    return {
      ...data, loading: Boolean(user && loadedForUser !== user), refreshing: loading, error, refresh,
      academicGroupsById, academicUnitsById, specializationsById, labGroupsById,
      subjectsById, offeringsById, teachersById, studentsById,
      currentStudent: user?.role === 'student' ? studentsById[user.profileId] : null,
      currentTeacher: user?.role === 'teacher' ? { id: user.profileId, firstName: user.firstName, lastName: user.lastName } : null,
      getLabGroupsForAcademicGroup, getRequestsForEnrollment,
      getLatestRequestForEnrollment: (id) => getRequestsForEnrollment(id)[0] || null,
      getEnrichedEnrollment,
      getEnrichedEnrollmentById: (id) => {
        const row = data.enrollments.find((item) => item.id === id);
        return row ? getEnrichedEnrollment(row) : null;
      },
      getOfferingEnrollments, getOfferingCoverage,
      maxStudentsPerLab: 16,
      subjectOfferings: data.offerings,
      createOffering: (body) => mutate('/offerings', 'POST', {
        subjectId: Number(body.subjectId), academicGroupId: Number(body.academicGroupId),
        academicYear: body.academicYear, semester: body.semester,
      }),
      toggleOfferingActive: (id) => mutate(`/offerings/${id}`, 'PATCH', { isActive: !offeringsById[id].isActive }),
      assignTeacherCoverage: (body) => mutate(`/offerings/${body.subjectOfferingId}/coverage`, 'PUT', {
        teacherId: Number(body.teacherId), mode: body.mode,
        labGroupIds: body.labGroupIds.map(Number),
      }),
      createLabChangeRequest: (body) => mutate(`/enrollments/${body.studentSubjectEnrollmentId}/lab-change-requests`, 'POST', {
        requestedLabGroupId: Number(body.requestedLabGroupId),
      }),
      approveLabChangeRequest: (id) => mutate(`/lab-change-requests/${id}`, 'PATCH', { decision: 'APPROVED' }),
      rejectLabChangeRequest: (id) => mutate(`/lab-change-requests/${id}`, 'PATCH', { decision: 'REJECTED' }),
    };
  }, [data, error, loadedForUser, loading, refresh, user]);

  return <LabChangeContext.Provider value={value}>{children}</LabChangeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLabChange() {
  const context = useContext(LabChangeContext);
  if (!context) throw new Error('useLabChange must be used inside LabChangeProvider.');
  return context;
}
