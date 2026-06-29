import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  academicGroups,
  academicUnits,
  buildEnrollmentsForOffering,
  createInitialLabChangeState,
  currentActors,
  formatFullName,
  getNextRequestId,
  labGroups,
  MAX_STUDENTS_PER_LAB,
  specializations,
  students,
  subjectCatalog,
  subjectOfferings,
  teacherSubjectAssignments,
  teachers,
} from "../data/labChangeSystem.js";

const LabChangeContext = createContext(null);

function timestampNow() {
  return new Date().toISOString();
}

function buildOfferingId({ academicGroupId, subjectId, semester }, sequence) {
  return `off-${subjectId}-${academicGroupId.toLowerCase()}-${semester.toLowerCase()}-${sequence}`;
}

export function LabChangeProvider({ children }) {
  const initialState = useMemo(() => createInitialLabChangeState(), []);
  const [offerings, setOfferings] = useState(subjectOfferings);
  const [teacherAssignments, setTeacherAssignments] = useState(teacherSubjectAssignments);
  const [enrollments, setEnrollments] = useState(initialState.enrollments);
  const [labChangeRequests, setLabChangeRequests] = useState(initialState.requests);

  const academicUnitsById = useMemo(
    () => Object.fromEntries(academicUnits.map((unit) => [unit.id, unit])),
    []
  );
  const specializationsById = useMemo(
    () => Object.fromEntries(specializations.map((item) => [item.id, item])),
    []
  );
  const studentsById = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    []
  );
  const teachersById = useMemo(
    () => Object.fromEntries(teachers.map((teacher) => [teacher.id, teacher])),
    []
  );
  const offeringsById = useMemo(
    () => Object.fromEntries(offerings.map((offering) => [offering.id, offering])),
    [offerings]
  );
  const subjectsById = useMemo(
    () => Object.fromEntries(subjectCatalog.map((subject) => [subject.id, subject])),
    []
  );
  const academicGroupsById = useMemo(
    () => Object.fromEntries(academicGroups.map((group) => [group.id, group])),
    []
  );
  const labGroupsById = useMemo(
    () => Object.fromEntries(labGroups.map((labGroup) => [labGroup.id, labGroup])),
    []
  );

  const getLabGroupsForAcademicGroup = useCallback(
    (academicGroupId) =>
      (academicGroupsById[academicGroupId]?.labGroupIds ?? []).map(
        (labGroupId) => labGroupsById[labGroupId]
      ),
    [academicGroupsById, labGroupsById]
  );

  const getRequestsForEnrollment = useCallback(
    (enrollmentId) =>
      labChangeRequests
        .filter((request) => request.studentSubjectEnrollmentId === enrollmentId)
        .sort(
          (left, right) =>
            new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime()
        ),
    [labChangeRequests]
  );

  const getLatestRequestForEnrollment = useCallback(
    (enrollmentId) => getRequestsForEnrollment(enrollmentId)[0] ?? null,
    [getRequestsForEnrollment]
  );

  const getEnrichedEnrollment = useCallback(
    (enrollment) => {
      const offering = offeringsById[enrollment.subjectOfferingId];
      const student = studentsById[enrollment.studentId];
      const subject = subjectsById[offering.subjectId];
      const academicGroup = academicGroupsById[offering.academicGroupId];
      const specialization = specializationsById[academicGroup.specializationId];
      const academicUnit = academicUnitsById[specialization.academicUnitId];
      const currentLabGroup = labGroupsById[enrollment.labGroupId];
      const defaultLabGroup = labGroupsById[enrollment.defaultLabGroupId];
      const labGroupOptions = getLabGroupsForAcademicGroup(academicGroup.id);
      const requests = getRequestsForEnrollment(enrollment.id);
      const latestRequest = requests[0] ?? null;

      return {
        enrollment,
        student,
        studentName: formatFullName(student),
        subject,
        offering,
        academicGroup,
        specialization,
        academicUnit,
        currentLabGroup,
        defaultLabGroup,
        labGroupOptions,
        requests,
        latestRequest,
        isException: enrollment.labGroupId !== enrollment.defaultLabGroupId,
      };
    },
    [
      academicGroupsById,
      academicUnitsById,
      getLabGroupsForAcademicGroup,
      getRequestsForEnrollment,
      labGroupsById,
      offeringsById,
      specializationsById,
      studentsById,
      subjectsById,
    ]
  );

  const getEnrichedEnrollmentById = useCallback(
    (enrollmentId) => {
      const enrollment = enrollments.find((item) => item.id === enrollmentId);
      return enrollment ? getEnrichedEnrollment(enrollment) : null;
    },
    [enrollments, getEnrichedEnrollment]
  );

  const getOfferingCoverage = useCallback(
    (offeringId) => {
      const offering = offeringsById[offeringId];

      if (!offering) {
        return null;
      }

      const groupLabIds = academicGroupsById[offering.academicGroupId]?.labGroupIds ?? [];
      const coverageAssignments = teacherAssignments.filter(
        (assignment) => assignment.subjectOfferingId === offeringId
      );
      const coveredLabIds = [...new Set(coverageAssignments.map((item) => item.labGroupId))];
      const uncoveredLabIds = groupLabIds.filter((labGroupId) => !coveredLabIds.includes(labGroupId));
      const teacherIds = [...new Set(coverageAssignments.map((item) => item.teacherId))];

      return {
        offering,
        coveredLabIds,
        uncoveredLabIds,
        teacherIds,
        coveredCount: coveredLabIds.length,
        totalCount: groupLabIds.length,
        isFullyCovered: uncoveredLabIds.length === 0,
      };
    },
    [academicGroupsById, offeringsById, teacherAssignments]
  );

  const getOfferingEnrollments = useCallback(
    (offeringId) =>
      enrollments
        .filter((enrollment) => enrollment.subjectOfferingId === offeringId)
        .map(getEnrichedEnrollment),
    [enrollments, getEnrichedEnrollment]
  );

  const createLabChangeRequest = ({ studentSubjectEnrollmentId, requestedLabGroupId }) => {
    const enrollment = enrollments.find((item) => item.id === studentSubjectEnrollmentId);

    if (!enrollment) {
      return { ok: false, message: "Enrollment not found." };
    }

    if (
      labChangeRequests.some(
        (request) =>
          request.studentSubjectEnrollmentId === studentSubjectEnrollmentId &&
          request.status === "PENDING"
      )
    ) {
      return { ok: false, message: "Pending request already exists for this enrollment." };
    }

    if (enrollment.labGroupId === requestedLabGroupId) {
      return { ok: false, message: "Requested lab group must differ from current lab group." };
    }

    const offering = offeringsById[enrollment.subjectOfferingId];
    const academicGroup = academicGroupsById[offering.academicGroupId];

    if (!academicGroup.labGroupIds.includes(requestedLabGroupId)) {
      return { ok: false, message: "Requested lab group is outside student academic group." };
    }

    setLabChangeRequests((currentRequests) => [
      ...currentRequests,
      {
        id: getNextRequestId(currentRequests),
        studentSubjectEnrollmentId,
        currentLabGroupId: enrollment.labGroupId,
        requestedLabGroupId,
        status: "PENDING",
        requestedAt: timestampNow(),
        decidedAt: null,
        decidedByTeacherId: null,
      },
    ]);

    return { ok: true };
  };

  const decideLabChangeRequest = (requestId, teacherId, status) => {
    const request = labChangeRequests.find((item) => item.id === requestId);

    if (!request) {
      return { ok: false, message: "Request not found." };
    }

    if (request.status !== "PENDING") {
      return { ok: false, message: "Only pending requests can be decided." };
    }

    const enrollment = enrollments.find(
      (item) => item.id === request.studentSubjectEnrollmentId
    );

    if (!enrollment) {
      return { ok: false, message: "Enrollment not found." };
    }

    const teacherCanDecide = teacherAssignments.some(
      (assignment) =>
        assignment.teacherId === teacherId &&
        assignment.subjectOfferingId === enrollment.subjectOfferingId
    );

    if (!teacherCanDecide) {
      return {
        ok: false,
        message: "Teacher must be assigned to this subject offering.",
      };
    }

    const decidedAt = timestampNow();

    setLabChangeRequests((currentRequests) =>
      currentRequests.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status,
              decidedAt,
              decidedByTeacherId: teacherId,
            }
          : item
      )
    );

    if (status === "APPROVED") {
      setEnrollments((currentEnrollments) =>
        currentEnrollments.map((item) =>
          item.id === request.studentSubjectEnrollmentId
            ? { ...item, labGroupId: request.requestedLabGroupId }
            : item
        )
      );
    }

    return { ok: true };
  };

  const approveLabChangeRequest = (requestId, teacherId) =>
    decideLabChangeRequest(requestId, teacherId, "APPROVED");

  const rejectLabChangeRequest = (requestId, teacherId) =>
    decideLabChangeRequest(requestId, teacherId, "REJECTED");

  const createOffering = ({
    academicGroupId,
    academicYear,
    semester,
    subjectId,
    totalGrade,
  }) => {
    if (
      offerings.some(
        (offering) =>
          offering.subjectId === subjectId &&
          offering.academicGroupId === academicGroupId &&
          offering.academicYear === academicYear &&
          offering.semester === semester
      )
    ) {
      return { ok: false, message: "Offering already exists for this group, year, and semester." };
    }

    const nextOffering = {
      id: buildOfferingId(
        { academicGroupId, subjectId, semester },
        offerings.length + 1
      ),
      subjectId,
      academicGroupId,
      academicYear,
      semester,
      totalGrade: Number(totalGrade),
      isActive: true,
      createdAt: timestampNow(),
    };

    setOfferings((currentOfferings) => [...currentOfferings, nextOffering]);
    setEnrollments((currentEnrollments) => [
      ...currentEnrollments,
      ...buildEnrollmentsForOffering(nextOffering, academicGroups),
    ]);

    return { ok: true, offering: nextOffering };
  };

  const toggleOfferingActive = (offeringId) => {
    setOfferings((currentOfferings) =>
      currentOfferings.map((offering) =>
        offering.id === offeringId
          ? { ...offering, isActive: !offering.isActive }
          : offering
      )
    );
  };

  const assignTeacherCoverage = ({
    labGroupIds,
    mode = "all",
    subjectOfferingId,
    teacherId,
  }) => {
    const offering = offeringsById[subjectOfferingId];

    if (!offering) {
      return { ok: false, message: "Offering not found." };
    }

    const targetLabGroupIds =
      mode === "all"
        ? academicGroupsById[offering.academicGroupId]?.labGroupIds ?? []
        : labGroupIds;

    if (!targetLabGroupIds.length) {
      return { ok: false, message: "Choose at least one lab group." };
    }

    setTeacherAssignments((currentAssignments) => {
      const filteredAssignments = currentAssignments.filter(
        (assignment) =>
          !(
            assignment.subjectOfferingId === subjectOfferingId &&
            targetLabGroupIds.includes(assignment.labGroupId)
          )
      );

      const newAssignments = targetLabGroupIds.map((labGroupId) => ({
        teacherId,
        subjectOfferingId,
        labGroupId,
      }));

      return [...filteredAssignments, ...newAssignments];
    });

    return { ok: true, assignedCount: targetLabGroupIds.length };
  };

  const value = {
    academicGroups,
    academicGroupsById,
    academicUnits,
    academicUnitsById,
    currentStudent: studentsById[currentActors.studentId],
    currentTeacher: teachersById[currentActors.teacherId],
    enrollments,
    getEnrichedEnrollment,
    getEnrichedEnrollmentById,
    getLabGroupsForAcademicGroup,
    getLatestRequestForEnrollment,
    getOfferingCoverage,
    getOfferingEnrollments,
    getRequestsForEnrollment,
    labChangeRequests,
    labGroups,
    labGroupsById,
    maxStudentsPerLab: MAX_STUDENTS_PER_LAB,
    offerings,
    offeringsById,
    specializations,
    specializationsById,
    students,
    studentsById,
    subjectCatalog,
    subjectsById,
    teacherAssignments,
    teachers,
    teachersById,
    createLabChangeRequest,
    approveLabChangeRequest,
    rejectLabChangeRequest,
    createOffering,
    toggleOfferingActive,
    assignTeacherCoverage,
  };

  return (
    <LabChangeContext.Provider value={value}>
      {children}
    </LabChangeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLabChange() {
  const context = useContext(LabChangeContext);

  if (!context) {
    throw new Error("useLabChange must be used inside LabChangeProvider.");
  }

  return context;
}
