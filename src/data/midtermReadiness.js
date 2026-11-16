import { getLabTitle, getMidtermLabPoints, MIDTERM_LAB_POINTS } from './labData.js';

export function getMidtermReadiness({ labs, midtermNo, enrollments, rows, studentsById }) {
  const midtermLabs = labs.filter((lab) => (lab.midtermNo ?? 1) === midtermNo);
  const assignedPoints = getMidtermLabPoints(midtermLabs, midtermNo);
  const incompleteStudents = enrollments.flatMap((enrollment) => {
    const row = rows.find((student) => student.enrollmentId === enrollment.id);
    const person = studentsById[enrollment.studentId];
    const issues = midtermLabs.flatMap((lab) => {
      const result = row?.labs?.[lab.id];
      const missing = [];
      if (!Number.isInteger(result?.grade) || result.grade < 0 || result.grade > lab.difficulty) {
        missing.push({ field: 'grade', labId: lab.id, label: `${getLabTitle(lab)} — grade` });
      }
      if (!['present', 'absent', 'excused'].includes(result?.attendance)) {
        missing.push({ field: 'attendance', labId: lab.id, label: `${getLabTitle(lab)} — attendance` });
      }
      return missing;
    });
    const examScore = row?.examScores?.[midtermNo];
    if (!Number.isInteger(examScore) || examScore < 0 || examScore > 4) {
      issues.push({ field: 'exam', label: 'Exam score (0–4)' });
    }
    return issues.length ? [{
      enrollmentId: enrollment.id,
      labGroupId: enrollment.labGroupId,
      name: person ? `${person.firstName} ${person.lastName}` : row?.name ?? 'Student',
      issues,
    }] : [];
  });
  const pointsReady = assignedPoints === MIDTERM_LAB_POINTS;
  return {
    ok: pointsReady && incompleteStudents.length === 0,
    pointsReady,
    assignedPoints,
    incompleteStudents,
    message: !pointsReady ? 'Midterm labs must total exactly 16 points.'
      : incompleteStudents.length ? `Complete every lab grade, attendance, and exam score for ${incompleteStudents.length} student(s) before locking.` : undefined,
  };
}

export function midtermFieldId(enrollmentId, midtermNo, field, labId) {
  return `midterm-${midtermNo}-${enrollmentId}-${field}-${labId ?? 'exam'}`;
}
