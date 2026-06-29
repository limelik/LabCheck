import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

function getCoverageLabel(row, teachersById) {
  if (!row.coverage.teacherIds.length) {
    return "No teacher";
  }

  if (row.coverage.teacherIds.length === 1 && row.coverage.coveredCount === row.coverage.totalCount) {
    const teacher = teachersById[row.coverage.teacherIds[0]];
    return `${teacher.firstName} ${teacher.lastName} covers all labs`;
  }

  return `${row.coverage.teacherIds.length} teachers assigned`;
}

export default function AssignTeachers() {
  const {
    academicGroupsById,
    assignTeacherCoverage,
    getLabGroupsForAcademicGroup,
    getOfferingCoverage,
    offerings,
    subjectsById,
    teachers,
    teachersById,
  } = useLabChange();

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedOffering, setSelectedOffering] = useState("");
  const [mode, setMode] = useState("all");
  const [selectedLabGroupIds, setSelectedLabGroupIds] = useState([]);
  const [message, setMessage] = useState("");

  const selectedOfferingRecord = offerings.find((offering) => offering.id === selectedOffering);
  const selectableLabGroups = selectedOfferingRecord
    ? getLabGroupsForAcademicGroup(selectedOfferingRecord.academicGroupId)
    : [];

  const coverageRows = useMemo(
    () =>
      offerings.map((offering) => ({
        offering,
        subject: subjectsById[offering.subjectId],
        academicGroup: academicGroupsById[offering.academicGroupId],
        coverage: getOfferingCoverage(offering.id),
      })),
    [academicGroupsById, getOfferingCoverage, offerings, subjectsById]
  );

  const toggleLabGroup = (labGroupId) => {
    setSelectedLabGroupIds((current) =>
      current.includes(labGroupId)
        ? current.filter((item) => item !== labGroupId)
        : [...current, labGroupId]
    );
  };

  const assignCoverage = () => {
    const result = assignTeacherCoverage({
      labGroupIds: selectedLabGroupIds,
      mode,
      subjectOfferingId: selectedOffering,
      teacherId: Number(selectedTeacher),
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage(
      mode === "all"
        ? "Teacher now covers all labs in selected offering."
        : `Teacher assigned to ${result.assignedCount} lab groups.`
    );
    setSelectedTeacher("");
    setSelectedOffering("");
    setMode("all");
    setSelectedLabGroupIds([]);
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Teacher Coverage</h1>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="placement-card-header">
            <div>
              <h3 style={{ marginBottom: "0.35rem" }}>Bulk assign teaching coverage</h3>
              <div className="placement-meta">
                Common case: one teacher handles whole academic group. Use assign-all first, split by
                lab only when needed.
              </div>
            </div>
            <span className="status-badge status-badge-neutral">Per offering + lab group</span>
          </div>

          <div className="admin-form-grid">
            <select
              className="form-input"
              value={selectedTeacher}
              onChange={(event) => setSelectedTeacher(event.target.value)}
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>

            <select
              className="form-input"
              value={selectedOffering}
              onChange={(event) => {
                setSelectedOffering(event.target.value);
                setSelectedLabGroupIds([]);
              }}
            >
              <option value="">Select offering</option>
              {coverageRows.map((row) => (
                <option key={row.offering.id} value={row.offering.id}>
                  {row.subject.name} - {row.academicGroup.code} - {row.offering.semester}
                </option>
              ))}
            </select>

            <select
              className="form-input"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value);
                setSelectedLabGroupIds([]);
              }}
            >
              <option value="all">Assign all labs</option>
              <option value="split">Assign selected labs</option>
            </select>

            <button
              className="primary-button"
              disabled={
                !selectedTeacher ||
                !selectedOffering ||
                (mode === "split" && selectedLabGroupIds.length === 0)
              }
              onClick={assignCoverage}
            >
              Save Coverage
            </button>
          </div>

          {mode === "split" && selectableLabGroups.length > 0 && (
            <div className="chip-row" style={{ marginTop: "1rem" }}>
              {selectableLabGroups.map((labGroup) => (
                <button
                  key={labGroup.id}
                  className={
                    "subject-pill filter-pill" +
                    (selectedLabGroupIds.includes(labGroup.id) ? " subject-pill-active" : "")
                  }
                  onClick={() => toggleLabGroup(labGroup.id)}
                >
                  {labGroup.code}
                </button>
              ))}
            </div>
          )}

          {message && (
            <p className="student-helper-text" style={{ marginBottom: 0 }}>
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Offering</th>
                <th>Labs</th>
                <th>Coverage</th>
                <th>Teachers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coverageRows.map((row) => (
                <tr key={row.offering.id}>
                  <td>
                    {row.subject.name}
                    <div className="placement-meta">
                      {row.academicGroup.code} • {row.offering.academicYear} • {row.offering.semester}
                    </div>
                  </td>
                  <td>{row.academicGroup.labGroupIds.join(", ")}</td>
                  <td>
                    {row.coverage.coveredCount}/{row.coverage.totalCount}
                  </td>
                  <td>{getCoverageLabel(row, teachersById)}</td>
                  <td>
                    <span
                      className={
                        row.coverage.isFullyCovered
                          ? "status-badge status-badge-approved"
                          : "status-badge status-badge-pending"
                      }
                    >
                      {row.coverage.isFullyCovered ? "Covered" : "Needs coverage"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
