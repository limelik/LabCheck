import { useState } from "react";
import { labs } from "../../data/labData";
import { teacherProgressData } from "../../data/teacherProgressData";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./TeacherProgressTable.css";

export default function TeacherProgressTable({ subjectId, groupId, subgroupId }) {
  const labList = labs[subjectId]?.[groupId] || [];
  const initialStudents =
    teacherProgressData[subjectId]?.[groupId]?.[subgroupId]?.students || [];

  const [students, setStudents] = useState(initialStudents);

  if (!labList.length || !students.length) {
    return <p className="placeholder">No progress data available.</p>;
  }

  // Attendance: present → absent → empty → present ...
  const cycleAttendance = (a) => {
    if (a === "present") return "absent";
    if (a === "absent") return "empty";
    return "present";
  };

  const handleAttendanceClick = (index, labId) => {
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

      teacherProgressData[subjectId][groupId][subgroupId].students = updated;
      return updated;
    });
  };

  // Grade dropdown update
  const handleGradeChange = (index, labId, value) => {
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

      teacherProgressData[subjectId][groupId][subgroupId].students = updated;
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

  // Final grade: based on difficulty caps, scaled to 16
  const calculateFinal16 = (student) => {
    if (hasUngradedLab(student)) return "";

    let studentPoints = 0;
    let maxPoints = 0;

    for (const lab of labList) {
      const difficulty = Number(lab.difficulty ?? 1);
      const grade = Number(student.labs?.[lab.id]?.grade ?? 0);

      studentPoints += grade;
      maxPoints += difficulty;
    }

    if (maxPoints === 0) return "";
    return Math.round((studentPoints / maxPoints) * 16);
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
      <h2>
        Progress Overview — {groupId} / {subgroupId}
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
            <th>Final (0–16)</th>
          </tr>
        </thead>

        <tbody>
          {students.map((s, index) => {
            const absences = getAbsences(s);
            const notAllowed = absences >= 3;
            const final16 = calculateFinal16(s);

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
                  {final16 === "" ? "—" : final16}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="legend">
        Grade: 0..Difficulty &nbsp;&nbsp; Ն = Present &nbsp;&nbsp; Բ = Absent
        &nbsp;&nbsp; 3+ absences → Not allowed
      </div>

      {/* Export button */}
      <button className="export-btn" onClick={exportNotAllowedToExcel}>
        ⬇ Export Not allowed
      </button>
    </div>
  );
}
