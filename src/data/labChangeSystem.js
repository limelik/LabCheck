export const MAX_STUDENTS_PER_LAB = 16;

export const currentActors = {
  studentId: 1,
  teacherId: 1,
};

export const academicUnits = [
  {
    id: "inst-se",
    code: "INST-SE",
    name: "Software Systems Institute",
  },
  {
    id: "fac-it",
    code: "FAC-IT",
    name: "Information Technologies Faculty",
  },
];

export const specializations = [
  {
    id: "spec-se",
    code: "19",
    name: "Software Engineering",
    academicUnitId: "inst-se",
  },
  {
    id: "spec-cs",
    code: "20",
    name: "Computer Science",
    academicUnitId: "fac-it",
  },
];

export const academicGroupSeeds = [
  {
    id: "TT319",
    code: "TT319",
    name: "TT319 Software Engineering",
    specializationId: "spec-se",
    startYear: 2023,
  },
  {
    id: "TT320",
    code: "TT320",
    name: "TT320 Computer Science",
    specializationId: "spec-cs",
    startYear: 2023,
  },
];

export const students = [
  {
    id: 1,
    firstName: "Milena",
    lastName: "Simonyan",
    email: "milena.simonyan@polytechnic.am",
    academicGroupId: "TT319",
  },
  {
    id: 2,
    firstName: "Liana",
    lastName: "Melikyan",
    email: "liana.melikyan@polytechnic.am",
    academicGroupId: "TT319",
  },
  {
    id: 3,
    firstName: "Armen",
    lastName: "Petrosyan",
    email: "armen.petrosyan@polytechnic.am",
    academicGroupId: "TT319",
  },
  {
    id: 4,
    firstName: "Narek",
    lastName: "Sargsyan",
    email: "narek.sargsyan@polytechnic.am",
    academicGroupId: "TT319",
  },
  {
    id: 5,
    firstName: "Davit",
    lastName: "Khachatryan",
    email: "davit.khachatryan@polytechnic.am",
    academicGroupId: "TT319",
  },
  {
    id: 6,
    firstName: "Sara",
    lastName: "Harutyunyan",
    email: "sara.harutyunyan@polytechnic.am",
    academicGroupId: "TT319",
  },
  {
    id: 7,
    firstName: "Anna",
    lastName: "Vardanyan",
    email: "anna.vardanyan@polytechnic.am",
    academicGroupId: "TT320",
  },
  {
    id: 8,
    firstName: "Gor",
    lastName: "Grigoryan",
    email: "gor.grigoryan@polytechnic.am",
    academicGroupId: "TT320",
  },
  {
    id: 9,
    firstName: "Hakob",
    lastName: "Gasparyan",
    email: "hakob.gasparyan@polytechnic.am",
    academicGroupId: "TT320",
  },
  {
    id: 10,
    firstName: "Mery",
    lastName: "Stepanyan",
    email: "mery.stepanyan@polytechnic.am",
    academicGroupId: "TT320",
  },
];

export const teachers = [
  {
    id: 1,
    firstName: "Ani",
    lastName: "Hakobyan",
    email: "ani.hakobyan@polytechnic.am",
    status: "active",
  },
  {
    id: 2,
    firstName: "Marine",
    lastName: "Avetisyan",
    email: "marine.avetisyan@polytechnic.am",
    status: "active",
  },
  {
    id: 3,
    firstName: "Karen",
    lastName: "Mkrtchyan",
    email: "karen.mkrtchyan@polytechnic.am",
    status: "active",
  },
];

export const subjectCatalog = [
  { id: "cyber", code: "CYB201", name: "Cybersecurity" },
  { id: "sql", code: "DB101", name: "SQL" },
  { id: "web", code: "WEB201", name: "Web Development" },
];

export function getRecommendedLabCount(studentCount, maxStudentsPerLab = MAX_STUDENTS_PER_LAB) {
  return Math.max(3, Math.ceil(studentCount / maxStudentsPerLab));
}

function buildLabGroupId(academicGroupCode, index) {
  return `${academicGroupCode.replace(/^TT/, "")}-${index}`;
}

function buildAcademicGroups() {
  return academicGroupSeeds.map((group) => {
    const studentCount = students.filter(
      (student) => student.academicGroupId === group.id
    ).length;
    const recommendedLabCount = getRecommendedLabCount(studentCount);
    const labGroupIds = Array.from({ length: recommendedLabCount }, (_, index) =>
      buildLabGroupId(group.code, index + 1)
    );

    return {
      ...group,
      studentCount,
      recommendedLabCount,
      labGroupIds,
    };
  });
}

export const academicGroups = buildAcademicGroups();

export const labGroups = academicGroups.flatMap((group) =>
  group.labGroupIds.map((labGroupId, index) => ({
    id: labGroupId,
    code: labGroupId,
    name: `Lab ${index + 1}`,
    number: index + 1,
    academicGroupId: group.id,
  }))
);

export const subjectOfferings = [
  {
    id: "off-cyber-tt319-fall",
    subjectId: "cyber",
    academicGroupId: "TT319",
    academicYear: "2025-2026",
    semester: "Fall",
    totalGrade: 16,
    isActive: true,
    createdAt: "2026-02-01T09:00:00+04:00",
  },
  {
    id: "off-sql-tt319-fall",
    subjectId: "sql",
    academicGroupId: "TT319",
    academicYear: "2025-2026",
    semester: "Fall",
    totalGrade: 16,
    isActive: true,
    createdAt: "2026-02-02T09:00:00+04:00",
  },
  {
    id: "off-web-tt319-fall",
    subjectId: "web",
    academicGroupId: "TT319",
    academicYear: "2025-2026",
    semester: "Fall",
    totalGrade: 16,
    isActive: true,
    createdAt: "2026-02-03T09:00:00+04:00",
  },
  {
    id: "off-cyber-tt320-fall",
    subjectId: "cyber",
    academicGroupId: "TT320",
    academicYear: "2025-2026",
    semester: "Fall",
    totalGrade: 16,
    isActive: true,
    createdAt: "2026-02-04T09:00:00+04:00",
  },
];

export const teacherSubjectAssignments = [
  { teacherId: 1, subjectOfferingId: "off-cyber-tt319-fall", labGroupId: "319-1" },
  { teacherId: 1, subjectOfferingId: "off-cyber-tt319-fall", labGroupId: "319-2" },
  { teacherId: 1, subjectOfferingId: "off-cyber-tt319-fall", labGroupId: "319-3" },
  { teacherId: 1, subjectOfferingId: "off-sql-tt319-fall", labGroupId: "319-1" },
  { teacherId: 1, subjectOfferingId: "off-sql-tt319-fall", labGroupId: "319-2" },
  { teacherId: 1, subjectOfferingId: "off-sql-tt319-fall", labGroupId: "319-3" },
  { teacherId: 2, subjectOfferingId: "off-web-tt319-fall", labGroupId: "319-1" },
  { teacherId: 2, subjectOfferingId: "off-web-tt319-fall", labGroupId: "319-2" },
  { teacherId: 2, subjectOfferingId: "off-web-tt319-fall", labGroupId: "319-3" },
  { teacherId: 3, subjectOfferingId: "off-cyber-tt320-fall", labGroupId: "320-1" },
  { teacherId: 3, subjectOfferingId: "off-cyber-tt320-fall", labGroupId: "320-2" },
  { teacherId: 3, subjectOfferingId: "off-cyber-tt320-fall", labGroupId: "320-3" },
];

export function getEnrollmentId(subjectOfferingId, studentId) {
  return `${subjectOfferingId}-${studentId}`;
}

function sortStudentsBySurname(studentList) {
  return [...studentList].sort((left, right) => {
    const lastNameCompare = left.lastName.localeCompare(right.lastName);

    if (lastNameCompare !== 0) {
      return lastNameCompare;
    }

    return left.firstName.localeCompare(right.firstName);
  });
}

export function buildEnrollmentsForOffering(offering, academicGroupList = academicGroups) {
  const academicGroup = academicGroupList.find(
    (group) => group.id === offering.academicGroupId
  );
  const availableLabGroups = academicGroup?.labGroupIds ?? [];
  const groupStudents = sortStudentsBySurname(
    students.filter((student) => student.academicGroupId === offering.academicGroupId)
  );

  return groupStudents.map((student, index) => {
    const assignedLabGroupId = availableLabGroups[index % availableLabGroups.length];

    return {
      id: getEnrollmentId(offering.id, student.id),
      studentId: student.id,
      subjectOfferingId: offering.id,
      labGroupId: assignedLabGroupId,
      defaultLabGroupId: assignedLabGroupId,
      enrolledAt: offering.createdAt,
    };
  });
}

export function buildAutoAssignedEnrollments(offerings = subjectOfferings) {
  return offerings.flatMap((offering) => buildEnrollmentsForOffering(offering));
}

export const seedLabChangeRequests = [
  {
    id: 1,
    studentSubjectEnrollmentId: getEnrollmentId("off-cyber-tt319-fall", 2),
    currentLabGroupId: "319-3",
    requestedLabGroupId: "319-2",
    status: "APPROVED",
    requestedAt: "2026-03-10T10:15:00+04:00",
    decidedAt: "2026-03-11T11:00:00+04:00",
    decidedByTeacherId: 1,
  },
  {
    id: 2,
    studentSubjectEnrollmentId: getEnrollmentId("off-sql-tt319-fall", 1),
    currentLabGroupId: "319-3",
    requestedLabGroupId: "319-1",
    status: "PENDING",
    requestedAt: "2026-05-26T14:30:00+04:00",
    decidedAt: null,
    decidedByTeacherId: null,
  },
  {
    id: 3,
    studentSubjectEnrollmentId: getEnrollmentId("off-cyber-tt319-fall", 3),
    currentLabGroupId: "319-1",
    requestedLabGroupId: "319-2",
    status: "REJECTED",
    requestedAt: "2026-04-05T09:40:00+04:00",
    decidedAt: "2026-04-06T09:00:00+04:00",
    decidedByTeacherId: 1,
  },
];

export function createInitialLabChangeState(offerings = subjectOfferings) {
  const enrollments = buildAutoAssignedEnrollments(offerings);

  seedLabChangeRequests
    .filter((request) => request.status === "APPROVED")
    .forEach((request) => {
      const enrollment = enrollments.find(
        (item) => item.id === request.studentSubjectEnrollmentId
      );

      if (enrollment) {
        enrollment.labGroupId = request.requestedLabGroupId;
      }
    });

  return {
    enrollments,
    requests: seedLabChangeRequests,
  };
}

export function getNextRequestId(requests) {
  return requests.reduce((maxId, request) => Math.max(maxId, request.id), 0) + 1;
}

export function formatFullName(person) {
  return `${person.firstName} ${person.lastName}`;
}
