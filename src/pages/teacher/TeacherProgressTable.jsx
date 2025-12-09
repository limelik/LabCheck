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

  // Cycle lab status: completed → incomplete → empty
  const cycleStatus = (status) => {
    if (status === "completed") return "incomplete";
    if (status === "incomplete") return "empty";
    return "completed";
  };

  // Cycle attendance: present → absent → empty
  const cycleAttendance = (a) => {
    if (a === "present") return "absent";
    if (a === "absent") return "empty";
    return "present";
  };

  // Update DB + local state for status click
  const handleStatusClick = (index, labId) => {
    setStudents((prev) => {
      const updated = prev.map((s, i) => {
        if (i !== index) return s;

        const current = s.labs[labId] || {
          status: "empty",
          attendance: "empty",
        };

        return {
          ...s,
          labs: {
            ...s.labs,
            [labId]: {
              ...current,
              status: cycleStatus(current.status),
            },
          },
        };
      });

      teacherProgressData[subjectId][groupId][subgroupId].students = updated;
      return updated;
    });
  };

  // Update DB + local state for attendance
  const handleAttendanceClick = (index, labId) => {
    setStudents((prev) => {
      const updated = prev.map((s, i) => {
        if (i !== index) return s;

        const current = s.labs[labId] || {
          status: "empty",
          attendance: "empty",
        };

        return {
          ...s,
          labs: {
            ...s.labs,
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

  // Final grade dropdown update
  const handleFinalGrade = (index, value) => {
    const grade = value === "ՉԹ" || value === "" ? value : Number(value);

    setStudents((prev) => {
      const updated = prev.map((s, i) =>
        i === index ? { ...s, finalGrade: grade } : s
      );

      teacherProgressData[subjectId][groupId][subgroupId].students = updated;
      return updated;
    });
  };

  // Excel export — only students with ՉԹ
  const exportFailedToExcel = () => {
    const failed = students.filter((s) => s.finalGrade === "ՉԹ");

    if (failed.length === 0) {
      alert("No students with ՉԹ.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      failed.map((s) => ({ Name: s.name, Final: s.finalGrade }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Failed");

    const filename = `${groupId}_${subgroupId}_FailedStudents.xlsx`;
    const excelFile = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(new Blob([excelFile]), filename);
  };

  const renderStatusBox = (s) => {
    if (s === "completed") return ["status-box status-completed", "✓"];
    if (s === "incomplete") return ["status-box status-pending", "✕"];
    return ["status-box status-empty", ""];
  };

  const renderAttendanceBox = (s) => {
    if (s === "present") return ["status-box attendance-present", "Ն"];
    if (s === "absent") return ["status-box attendance-absent", "Բ"];
    return ["status-box status-empty", ""];
  };

  const gradeOptions = Array.from({ length: 17 }, (_, i) => i);

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
              <th key={lab.id}>Lab {index + 1}</th>
            ))}
            <th>Final Grade</th>
          </tr>
        </thead>

        <tbody>
          {students.map((s, index) => (
            <tr key={s.id}>
              <td>{s.name}</td>

              {labList.map((lab) => {
                const entry = s.labs[lab.id] || {
                  status: "empty",
                  attendance: "empty",
                };

                const [statusClass, statusSymbol] = renderStatusBox(
                  entry.status
                );
                const [attClass, attSymbol] = renderAttendanceBox(
                  entry.attendance
                );

                return (
                  <td key={lab.id}>
                    <div className="status-cell">
                      <div
                        className={statusClass}
                        onClick={() => handleStatusClick(index, lab.id)}
                      >
                        {statusSymbol}
                      </div>
                      <div
                        className={attClass}
                        onClick={() => handleAttendanceClick(index, lab.id)}
                      >
                        {attSymbol}
                      </div>
                    </div>
                  </td>
                );
              })}

              <td>
                <select
                  className="final-grade-select"
                  value={s.finalGrade === undefined ? "" : s.finalGrade}
                  onChange={(e) => handleFinalGrade(index, e.target.value)}
                >
                  <option value="">—</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="ՉԹ">ՉԹ</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="legend">
        ✓ = Completed &nbsp;&nbsp; ✕ = Incomplete &nbsp;&nbsp; Ն = Present
        &nbsp;&nbsp; Բ = Absent
      </div>

      {/* Export button */}
      <button className="export-btn" onClick={exportFailedToExcel}>
        ⬇ Export
      </button>
    </div>
  );
}
