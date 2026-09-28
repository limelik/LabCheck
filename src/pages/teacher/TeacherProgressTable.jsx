import { useEffect, useMemo, useState } from "react";
import { labs } from "../../data/labData";
import { teacherProgressData } from "../../data/teacherProgressData";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./TeacherProgressTable.css";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import MidtermControls from "./MidtermControls.jsx";

export default function TeacherProgressTable({ subjectId, groupId, subgroupId }) {
  const {
    enrollments,
    getActiveMidterm,
    isFirstMidtermLocked,
    isSecondMidtermLocked,
    offerings,
    studentsById,
  } = useLabChange();
  const activeMidterm = getActiveMidterm(subjectId, groupId);
  const readOnly = activeMidterm === 1
    ? isFirstMidtermLocked(subjectId, groupId)
    : isSecondMidtermLocked(subjectId, groupId);
  const labList = (labs[subjectId]?.[groupId] || []).filter(
    (lab) => (lab.midtermNo ?? 1) === activeMidterm
  );
  const initialStudents = useMemo(() => {
    const offering = offerings.find(
      (item) => item.subjectId === subjectId && item.academicGroupId === groupId
    );
    const savedRows = Object.values(teacherProgressData[subjectId]?.[groupId] ?? {})
      .flatMap((section) => section.students);
    if (!offering) return [];
    return enrollments
      .filter((item) => item.subjectOfferingId === offering.id && item.labGroupId === subgroupId)
      .map((item) => {
        const student = studentsById[item.studentId];
        const name = `${student.firstName} ${student.lastName}`;
        const saved = savedRows.find((row) => row.id === item.studentId);
        return {
          id: item.studentId,
          name,
          labs: saved?.labs ?? {},
          examScores: saved?.examScores ?? {},
        };
      });
  }, [enrollments, groupId, offerings, studentsById, subjectId, subgroupId]);

  const [students, setStudents] = useState(initialStudents);
  useEffect(() => setStudents(initialStudents), [initialStudents]);

  const saveRows = (rows) => {
    teacherProgressData[subjectId] ??= {};
    teacherProgressData[subjectId][groupId] ??= {};
    teacherProgressData[subjectId][groupId][subgroupId] ??= { students: [] };
    teacherProgressData[subjectId][groupId][subgroupId].students = rows;
  };

  if (!labList.length || !students.length) {
    return <><MidtermControls subjectId={subjectId} groupId={groupId} />
      <p className="placeholder">No progress data available for midterm {activeMidterm}.</p></>;
  }

  // Attendance: present → absent → empty → present ...
  const cycleAttendance = (a) => {
    if (a === "present") return "absent";
    if (a === "absent") return "empty";
    return "present";
  };

  const handleAttendanceClick = (index, labId) => {
    if (readOnly) return;
    setStudents((prev) => {
      const updated = prev.map((s, i) => {
        if (i !== index) return s;

        const current = s.labs?.[labId] || {
          grade: "empty",
          attendance: "empty",
        };

        return {
          ...s,
          labs: {
            ...(s.labs || {}),
            [labId]: {
              ...current,
              attendance: cycleAttendance(current.attendance),
            },
          },
        };
      });

      saveRows(updated);
      return updated;
    });
  };

  // Grade dropdown update
  const handleGradeChange = (index, labId, value) => {
    if (readOnly) return;
    const grade = value === "" ? "empty" : Number(value);

    setStudents((prev) => {
      const updated = prev.map((s, i) => {
        if (i !== index) return s;

        const current = s.labs?.[labId] || {
          grade: "empty",
          attendance: "empty",
        };

        return {
          ...s,
          labs: {
            ...(s.labs || {}),
            [labId]: {
              ...current,
              grade,
            },
          },
        };
      });

      saveRows(updated);
      return updated;
    });
  };

  const handleExamChange = (index, value) => {
    if (readOnly) return;
    const score = value === "" ? null : Number(value);
    setStudents((prev) => {
      const updated = prev.map((student, i) => i === index
        ? {
            ...student,
            examScores: { ...student.examScores, [activeMidterm]: score },
          }
        : student);
      saveRows(updated);
      return updated;
    });
  };

  const renderAttendanceBox = (s) => {
    if (s === "present") return ["status-box attendance-present", "Ն"];
    if (s === "absent") return ["status-box attendance-absent", "Բ"];
    return ["status-box status-empty", ""];
  };

  const getAbsences = (student) => {
    let count = 0;
    for (const lab of labList) {
      if (student.labs?.[lab.id]?.attendance === "absent") count++;
    }
    return count;
  };

  // If ANY lab is not graded → don't show final
  const hasUngradedLab = (student) => {
    return labList.some((lab) => {
      const grade = student.labs?.[lab.id]?.grade;
      return grade === "empty" || grade === undefined;
    });
  };

  // Each midterm's lab points are summed directly, with a maximum of 16.
  const calculateLabPoints = (student) => {
    if (hasUngradedLab(student)) return "";

    let studentPoints = 0;

    for (const lab of labList) {
      const grade = Number(student.labs?.[lab.id]?.grade ?? 0);

      studentPoints += grade;
    }

    return studentPoints;
  };

  // Export — only Not allowed students, no grades
  const exportNotAllowedToExcel = () => {
    const notAllowedList = students
      .map((s) => ({
        name: s.name,
        absences: getAbsences(s),
      }))
      .filter((s) => s.absences >= 3);

    if (notAllowedList.length === 0) {
      alert("No students Not allowed.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      notAllowedList.map((s) => ({
        Name: s.name,
        Absences: s.absences,
        Midterm: "Not allowed",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NotAllowed");

    const filename = `${groupId}_${subgroupId}_NotAllowed.xlsx`;
    const excelFile = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(new Blob([excelFile]), filename);
  };

  return (
    <div>
      <MidtermControls subjectId={subjectId} groupId={groupId} />
      <h2>
        Progress Overview — {groupId} / {subgroupId} — midterm {activeMidterm}
      </h2>

      <table className="progress-table">
        <thead>
          <tr>
            <th>Student Name</th>

            {labList.map((lab, index) => (
              <th key={lab.id}>
                Lab {index + 1}
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Diff: {lab.difficulty ?? 1}
                </div>
              </th>
            ))}

            <th>Absences</th>
            <th>Midterm</th>
            <th>Lab points (0–16)</th>
            <th>Exam (0–4)</th>
            <th>Overall (0–20)</th>
          </tr>
        </thead>

        <tbody>
          {students.map((s, index) => {
            const absences = getAbsences(s);
            const notAllowed = absences >= 3;
            const labPoints = calculateLabPoints(s);
            const examScore = s.examScores?.[activeMidterm];
            const overallPoints = notAllowed
              ? "Not allowed"
              : labPoints === "" || examScore == null
                ? "—"
                : labPoints + examScore;

            return (
              <tr key={s.id}>
                <td>{s.name}</td>

                {labList.map((lab) => {
                  const entry = s.labs?.[lab.id] || {
                    grade: "empty",
                    attendance: "empty",
                  };

                  const [attClass, attSymbol] = renderAttendanceBox(
                    entry.attendance
                  );

                  return (
                    <td key={lab.id}>
                      <div className="status-cell">
                        {/* Grade dropdown */}
                        <select
                          className="grade-select"
                          value={entry.grade === "empty" ? "" : entry.grade}
                          onChange={(e) =>
                            handleGradeChange(index, lab.id, e.target.value)
                          }
                          disabled={readOnly}
                          title={`Grade 0–${lab.difficulty ?? 1}`}
                        >
                          <option value="">—</option>
                          {Array.from(
                            { length: (lab.difficulty ?? 1) + 1 },
                            (_, g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            )
                          )}
                        </select>

                        {/* Attendance box */}
                        <div
                          className={attClass}
                          onClick={() => handleAttendanceClick(index, lab.id)}
                          style={{ cursor: readOnly ? "default" : "pointer" }}
                          title="Click to cycle attendance"
                        >
                          {attSymbol}
                        </div>
                      </div>
                    </td>
                  );
                })}

                <td style={{ textAlign: "center" }}>{absences}</td>

                <td style={{ textAlign: "center", fontWeight: 700 }}>
                  {notAllowed ? "Not allowed" : "Allowed"}
                </td>

                <td style={{ textAlign: "center" }}>
                  {labPoints === "" ? "—" : labPoints}
                </td>
                <td style={{ textAlign: "center" }}>
                  <select
                    className="grade-select"
                    aria-label={`Exam score for ${s.name}, midterm ${activeMidterm}`}
                    value={examScore ?? ""}
                    onChange={(event) => handleExamChange(index, event.target.value)}
                    disabled={readOnly}
                  >
                    <option value="">—</option>
                    {[0, 1, 2, 3, 4].map((score) => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: "center" }}>
                  {overallPoints}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="legend">
        Grade: 0..Difficulty &nbsp;&nbsp; Ն = Present &nbsp;&nbsp; Բ = Absent
        &nbsp;&nbsp; Lab points: 0–16 &nbsp;&nbsp; Exam: 0–4
        &nbsp;&nbsp; Overall: 0–20 &nbsp;&nbsp; 3+ absences → Not allowed
      </div>

      {/* Export button */}
      <button className="export-btn" onClick={exportNotAllowedToExcel}>
        ⬇ Export Not allowed
      </button>
    </div>
  );
}
