import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { apiRequest } from "../lib/api.js";
import { getMidtermLabPoints, MIDTERM_LAB_POINTS } from "../data/labData.js";

const LabChangeContext = createContext(null);
const MAX_STUDENTS_PER_LAB = 16;
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

function fullName(person) {
  return `${person.firstName} ${person.lastName}`;
}

export function LabChangeProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [loadError, setLoadError] = useState("");
  const [activeMidterms, setActiveMidterms] = useState({});

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    try {
      const result = await apiRequest("/api/bootstrap");
      setData(result);
    } catch (error) {
      setLoadError(error.message || "Could not load LabCheck data.");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setActiveMidterms({});
    refresh().catch((error) => console.error("Could not load LabCheck data:", error));
  }, [refresh]);

  const academicGroups = data?.academicGroups ?? EMPTY_ARRAY;
  const academicUnits = data?.academicUnits ?? EMPTY_ARRAY;
  const specializations = data?.specializations ?? EMPTY_ARRAY;
  const labGroups = data?.labGroups ?? EMPTY_ARRAY;
  const subjectCatalog = data?.subjectCatalog ?? EMPTY_ARRAY;
  const students = data?.students ?? EMPTY_ARRAY;
  const teachers = data?.teachers ?? EMPTY_ARRAY;
  const offerings = data?.offerings ?? EMPTY_ARRAY;
  const enrollments = data?.enrollments ?? EMPTY_ARRAY;
  const teacherAssignments = data?.teacherAssignments ?? EMPTY_ARRAY;
  const labChangeRequests = data?.labChangeRequests ?? EMPTY_ARRAY;
  const labsBySubject = data?.labs ?? EMPTY_OBJECT;
  const labsByOffering = data?.labsByOffering ?? EMPTY_OBJECT;
  const teacherProgressData = data?.teacherProgressData ?? EMPTY_OBJECT;
  const teacherProgressByOffering = data?.teacherProgressByOffering ?? EMPTY_OBJECT;
  const maxStudentsPerLab = data?.maxStudentsPerLab ?? MAX_STUDENTS_PER_LAB;

  const academicGroupsById = useMemo(
    () => Object.fromEntries(academicGroups.map((item) => [item.id, item])),
    [academicGroups]
  );
  const academicUnitsById = useMemo(
    () => Object.fromEntries(academicUnits.map((item) => [item.id, item])),
    [academicUnits]
  );
  const specializationsById = useMemo(
    () => Object.fromEntries(specializations.map((item) => [item.id, item])),
    [specializations]
  );
  const studentsById = useMemo(
    () => Object.fromEntries(students.map((item) => [item.id, item])),
    [students]
  );
  const teachersById = useMemo(
    () => Object.fromEntries(teachers.map((item) => [item.id, item])),
    [teachers]
  );
  const offeringsById = useMemo(
    () => Object.fromEntries(offerings.map((item) => [item.id, item])),
    [offerings]
  );
  const subjectsById = useMemo(
    () => Object.fromEntries(subjectCatalog.map((item) => [item.id, item])),
    [subjectCatalog]
  );
  const labGroupsById = useMemo(
    () => Object.fromEntries(labGroups.map((item) => [item.id, item])),
    [labGroups]
  );

  const getLabGroupsForAcademicGroup = useCallback(
    (academicGroupId) =>
      (academicGroupsById[academicGroupId]?.labGroupIds ?? [])
        .map((id) => labGroupsById[id])
        .filter(Boolean),
    [academicGroupsById, labGroupsById]
  );

  const getRequestsForEnrollment = useCallback(
    (enrollmentId) => labChangeRequests
      .filter((request) => request.studentSubjectEnrollmentId === enrollmentId)
      .sort((left, right) => new Date(right.requestedAt) - new Date(left.requestedAt)),
    [labChangeRequests]
  );
  const getLatestRequestForEnrollment = useCallback(
    (enrollmentId) => getRequestsForEnrollment(enrollmentId)[0] ?? null,
    [getRequestsForEnrollment]
  );

  const getEnrichedEnrollment = useCallback((enrollment) => {
    const offering = offeringsById[enrollment.subjectOfferingId];
    const student = studentsById[enrollment.studentId];
    const subject = offering && subjectsById[offering.subjectId];
    const academicGroup = offering && academicGroupsById[offering.academicGroupId];
    if (!offering || !student || !subject || !academicGroup) return null;
    const specialization = specializationsById[academicGroup.specializationId];
    const academicUnit = specialization && academicUnitsById[specialization.academicUnitId];
    const currentLabGroup = labGroupsById[enrollment.labGroupId];
    const defaultLabGroup = labGroupsById[enrollment.defaultLabGroupId];
    const requests = getRequestsForEnrollment(enrollment.id);
    return {
      enrollment,
      student,
      studentName: fullName(student),
      subject,
      offering,
      academicGroup,
      specialization,
      academicUnit,
      currentLabGroup,
      defaultLabGroup,
      labGroupOptions: getLabGroupsForAcademicGroup(academicGroup.id),
      requests,
      latestRequest: requests[0] ?? null,
      isException: enrollment.labGroupId !== enrollment.defaultLabGroupId,
    };
  }, [
    academicGroupsById,
    academicUnitsById,
    getLabGroupsForAcademicGroup,
    getRequestsForEnrollment,
    labGroupsById,
    offeringsById,
    specializationsById,
    studentsById,
    subjectsById,
  ]);

  const getEnrichedEnrollmentById = useCallback(
    (id) => {
      const enrollment = enrollments.find((item) => item.id === Number(id));
      return enrollment ? getEnrichedEnrollment(enrollment) : null;
    },
    [enrollments, getEnrichedEnrollment]
  );

  const getOfferingCoverage = useCallback((offeringId) => {
    const offering = offeringsById[offeringId];
    if (!offering) return null;
    const labIds = academicGroupsById[offering.academicGroupId]?.labGroupIds ?? [];
    const assignments = teacherAssignments.filter((item) => item.subjectOfferingId === offering.id);
    const coveredLabIds = [...new Set(assignments.map((item) => item.labGroupId))];
    const uncoveredLabIds = labIds.filter((id) => !coveredLabIds.includes(id));
    return {
      offering,
      coveredLabIds,
      uncoveredLabIds,
      teacherIds: [...new Set(assignments.map((item) => item.teacherId))],
      coveredCount: coveredLabIds.length,
      totalCount: labIds.length,
      isFullyCovered: uncoveredLabIds.length === 0,
    };
  }, [academicGroupsById, offeringsById, teacherAssignments]);

  const getOfferingEnrollments = useCallback(
    (offeringId) => enrollments
      .filter((item) => item.subjectOfferingId === Number(offeringId))
      .map(getEnrichedEnrollment)
      .filter(Boolean),
    [enrollments, getEnrichedEnrollment]
  );

  const getOfferingForGroup = useCallback((subjectId, groupId) => {
    const matches = offerings.filter(
      (item) => item.subjectId === subjectId && item.academicGroupId === groupId
    );
    return matches.length === 1 ? matches[0] : null;
  }, [offerings]);

  const getActiveMidtermForOffering = useCallback(
    (offeringId) => activeMidterms[`offering:${offeringId}`] ?? 1,
    [activeMidterms]
  );
  const getMidtermStatusForOffering = useCallback(
    (offeringId, midtermNo) => data?.midtermsByOffering?.[offeringId]?.[midtermNo] ?? "OPEN",
    [data]
  );
  const isFirstMidtermLockedForOffering = useCallback(
    (offeringId) => getMidtermStatusForOffering(offeringId, 1) === "LOCKED",
    [getMidtermStatusForOffering]
  );
  const isSecondMidtermLockedForOffering = useCallback(
    (offeringId) => getMidtermStatusForOffering(offeringId, 2) === "LOCKED",
    [getMidtermStatusForOffering]
  );
  const selectMidtermForOffering = useCallback((offeringId, midtermNo) => {
    if (midtermNo === 2 && !isFirstMidtermLockedForOffering(offeringId)) return;
    setActiveMidterms((current) => ({ ...current, [`offering:${offeringId}`]: midtermNo }));
  }, [isFirstMidtermLockedForOffering]);

  const getMidtermLockReadinessForOffering = useCallback((offeringId, midtermNo) => {
    const offering = offeringsById[offeringId];
    if (!offering) return { ok: false, message: "Select a valid offering before locking its midterm." };
    const midtermLabs = (labsByOffering[offering.id] ?? [])
      .filter((lab) => Number(lab.midtermNo) === midtermNo);
    if (getMidtermLabPoints(midtermLabs, midtermNo) !== MIDTERM_LAB_POINTS) {
      return { ok: false, message: "Midterm labs must total exactly 16 points." };
    }
    const offeringEnrollments = enrollments.filter((item) => item.subjectOfferingId === offering.id);
    const rows = Object.values(teacherProgressByOffering[offering.id] ?? {})
      .flatMap((section) => section.students);
    const incomplete = offeringEnrollments.filter((enrollment) => {
      const row = rows.find((student) => student.enrollmentId === enrollment.id);
      return !row || !midtermLabs.every((lab) => {
        const result = row.labs?.[lab.id];
        return Number.isInteger(result?.grade) && result.grade >= 0 &&
          result.grade <= lab.difficulty &&
          ["present", "absent", "excused"].includes(result.attendance);
      }) || !Number.isInteger(row.examScores?.[midtermNo]) ||
        row.examScores[midtermNo] < 0 || row.examScores[midtermNo] > 4;
    });
    return incomplete.length
      ? { ok: false, message: `Complete every lab grade, attendance, and exam score for ${incomplete.length} student(s) before locking.` }
      : { ok: true };
  }, [enrollments, labsByOffering, offeringsById, teacherProgressByOffering]);

  const getActiveMidterm = useCallback(
    (subjectId, groupId) => activeMidterms[`${subjectId}:${groupId}`] ?? 1,
    [activeMidterms]
  );
  const getMidtermStatus = useCallback((subjectId, groupId, midtermNo) => {
    const offering = getOfferingForGroup(subjectId, groupId);
    return offering ? data?.midterms?.[`${subjectId}:${groupId}`]?.[midtermNo] ?? "OPEN" : "OPEN";
  }, [data, getOfferingForGroup]);
  const isFirstMidtermLocked = useCallback(
    (subjectId, groupId) => getMidtermStatus(subjectId, groupId, 1) === "LOCKED",
    [getMidtermStatus]
  );
  const isSecondMidtermLocked = useCallback(
    (subjectId, groupId) => getMidtermStatus(subjectId, groupId, 2) === "LOCKED",
    [getMidtermStatus]
  );

  const selectMidterm = useCallback((subjectId, groupId, midtermNo) => {
    if (midtermNo === 2 && !isFirstMidtermLocked(subjectId, groupId)) return;
    setActiveMidterms((current) => ({ ...current, [`${subjectId}:${groupId}`]: midtermNo }));
  }, [isFirstMidtermLocked]);

  const getMidtermLockReadiness = useCallback((subjectId, groupId, midtermNo) => {
    const offering = getOfferingForGroup(subjectId, groupId);
    if (!offering) return { ok: false, message: "Select one semester offering before locking its midterm." };
    const midtermLabs = (labsBySubject[subjectId]?.[groupId] ?? [])
      .filter((lab) => Number(lab.midtermNo) === midtermNo);
    if (getMidtermLabPoints(midtermLabs, midtermNo) !== MIDTERM_LAB_POINTS) {
      return { ok: false, message: "Midterm labs must total exactly 16 points." };
    }
    const offeringEnrollments = enrollments.filter((item) => item.subjectOfferingId === offering.id);
    const rows = Object.values(teacherProgressData[subjectId]?.[groupId] ?? {})
      .flatMap((section) => section.students);
    const incomplete = offeringEnrollments.filter((enrollment) => {
      const row = rows.find((student) => student.id === enrollment.studentId);
      return !row || !midtermLabs.every((lab) => {
        const result = row.labs?.[lab.id];
        return Number.isInteger(result?.grade) && result.grade >= 0 &&
          result.grade <= lab.difficulty &&
          ["present", "absent", "excused"].includes(result.attendance);
      }) || !Number.isInteger(row.examScores?.[midtermNo]) ||
        row.examScores[midtermNo] < 0 || row.examScores[midtermNo] > 4;
    });
    return incomplete.length
      ? { ok: false, message: `Complete every lab grade, attendance, and exam score for ${incomplete.length} student(s) before locking.` }
      : { ok: true };
  }, [enrollments, getOfferingForGroup, labsBySubject, teacherProgressData]);

  const mutate = useCallback(async (path, method, body) => {
    try {
      const result = await apiRequest(path, {
        method,
        body: JSON.stringify(body),
      });
      await refresh();
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, message: error.message || "The change could not be saved." };
    }
  }, [refresh]);

  const createLabChangeRequest = useCallback(
    (details) => mutate("/api/student/lab-change-requests", "POST", details),
    [mutate]
  );
  const approveLabChangeRequest = useCallback(
    (id) => mutate(`/api/teacher/lab-change-requests/${id}`, "PATCH", { status: "APPROVED" }),
    [mutate]
  );
  const rejectLabChangeRequest = useCallback(
    (id) => mutate(`/api/teacher/lab-change-requests/${id}`, "PATCH", { status: "REJECTED" }),
    [mutate]
  );
  const createOffering = useCallback(
    (details) => mutate("/api/admin/offerings", "POST", details),
    [mutate]
  );
  const toggleOfferingActive = useCallback(
    (id) => mutate(`/api/admin/offerings/${id}/active`, "PATCH", {
      isActive: !offeringsById[id]?.isActive,
    }),
    [mutate, offeringsById]
  );
  const assignTeacherCoverage = useCallback(
    (details) => mutate("/api/admin/teacher-coverage", "POST", details),
    [mutate]
  );
  const saveLab = useCallback(
    (id, details) => mutate(`/api/teacher/labs/${id}`, "PATCH", details),
    [mutate]
  );
  const createLab = useCallback(
    (details) => mutate("/api/teacher/labs", "POST", details),
    [mutate]
  );
  const deleteLab = useCallback(
    (id) => mutate(`/api/teacher/labs/${id}`, "DELETE"),
    [mutate]
  );
  const saveLabResult = useCallback(
    (details) => mutate("/api/teacher/lab-results", "PUT", details),
    [mutate]
  );
  const saveExamResult = useCallback(
    (details) => mutate("/api/teacher/exam-results", "PUT", details),
    [mutate]
  );
  const uploadLabAttachment = useCallback(async (labId, file) => {
    const body = new FormData();
    body.append("file", file);
    try {
      const result = await apiRequest(`/api/teacher/labs/${labId}/attachments`, {
        method: "POST",
        body,
      });
      await refresh();
      return { ok: true, ...result.attachment };
    } catch (error) {
      return { ok: false, message: error.message || "The file could not be uploaded." };
    }
  }, [refresh]);
  const deleteLabAttachment = useCallback(
    (labId, attachmentId) => mutate(
      `/api/teacher/labs/${labId}/attachments/${attachmentId}`,
      "DELETE"
    ),
    [mutate]
  );

  const lockMidterm = useCallback(async (subjectId, groupId, midtermNo) => {
    const offering = getOfferingForGroup(subjectId, groupId);
    if (!offering) return { ok: false, message: "Select one semester offering before locking its midterm." };
    const result = await mutate(
      `/api/teacher/offerings/${offering.id}/midterms/${midtermNo}/lock`,
      "POST",
      {}
    );
    if (result.ok && midtermNo === 1) {
      setActiveMidterms((current) => ({ ...current, [`${subjectId}:${groupId}`]: 2 }));
    }
    return result;
  }, [getOfferingForGroup, mutate]);

  const lockMidtermForOffering = useCallback(async (offeringId, midtermNo) => {
    const offering = offeringsById[offeringId];
    if (!offering) return { ok: false, message: "Choose a valid offering." };
    const result = await mutate(
      `/api/teacher/offerings/${offering.id}/midterms/${midtermNo}/lock`,
      "POST",
      {}
    );
    if (result.ok && midtermNo === 1) {
      setActiveMidterms((current) => ({ ...current, [`offering:${offeringId}`]: 2 }));
    }
    return result;
  }, [mutate, offeringsById]);

  const currentStudent = data?.currentStudent ?? null;
  const currentTeacher = data?.currentTeacher ?? null;
  const value = {
    loading,
    loadError,
    refresh,
    academicGroups,
    academicGroupsById,
    academicUnits,
    academicUnitsById,
    currentStudent,
    currentTeacher,
    enrollments,
    getEnrichedEnrollment,
    getEnrichedEnrollmentById,
    getLabGroupsForAcademicGroup,
    getLatestRequestForEnrollment,
    getOfferingCoverage,
    getOfferingEnrollments,
    labChangeRequests,
    labGroups,
    labGroupsById,
    getActiveMidterm,
    getActiveMidtermForOffering,
    getMidtermLockReadiness,
    getMidtermLockReadinessForOffering,
    isFirstMidtermLocked,
    isFirstMidtermLockedForOffering,
    isSecondMidtermLocked,
    isSecondMidtermLockedForOffering,
    lockFirstMidtermForOffering: (offeringId) => lockMidtermForOffering(offeringId, 1),
    lockSecondMidtermForOffering: (offeringId) => lockMidtermForOffering(offeringId, 2),
    lockFirstMidterm: (subjectId, groupId) => lockMidterm(subjectId, groupId, 1),
    lockSecondMidterm: (subjectId, groupId) => lockMidterm(subjectId, groupId, 2),
    selectMidterm,
    selectMidtermForOffering,
    maxStudentsPerLab,
    offerings,
    offeringsById,
    specializations,
    specializationsById,
    students,
    studentsById,
    subjectCatalog,
    subjectsById,
    teacherAssignments,
    teacherProgressData,
    teacherProgressByOffering,
    teachers,
    teachersById,
    labs: labsBySubject,
    labsByOffering,
    createLabChangeRequest,
    approveLabChangeRequest,
    rejectLabChangeRequest,
    createOffering,
    toggleOfferingActive,
    assignTeacherCoverage,
    createLab,
    saveLab,
    deleteLab,
    saveLabResult,
    saveExamResult,
    uploadLabAttachment,
    deleteLabAttachment,
    getOfferingForGroup,
  };

  if (user && (loading || (!data && !loadError))) {
    return <p className="auth-info">Loading LabCheck data...</p>;
  }
  if (user && loadError && !data) {
    return (
      <div className="auth-error" role="alert">
        {loadError} <button type="button"
          onClick={() => refresh().catch((error) => console.error("Could not reload LabCheck data:", error))}>
          Try again
        </button>
      </div>
    );
  }

  return <LabChangeContext.Provider value={value}>{children}</LabChangeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLabChange() {
  const context = useContext(LabChangeContext);
  if (!context) throw new Error("useLabChange must be used inside LabChangeProvider.");
  return context;
}
