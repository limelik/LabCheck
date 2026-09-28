import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

export default function AssignSubjects() {
  const {
    academicGroups,
    createOffering,
    getOfferingCoverage,
    getOfferingEnrollments,
    labChangeRequests,
    offerings,
    subjectCatalog,
    subjectsById,
    toggleOfferingActive,
  } = useLabChange();

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [semester, setSemester] = useState("Fall");
  const [totalGrade, setTotalGrade] = useState("16");
  const [formMessage, setFormMessage] = useState("");

  const offeringRows = useMemo(
    () =>
      offerings.map((offering) => {
        const enrollments = getOfferingEnrollments(offering.id);
        const coverage = getOfferingCoverage(offering.id);
        const pendingRequests = labChangeRequests.filter((request) => {
          const enrollment = enrollments.find(
            (item) => item.enrollment.id === request.studentSubjectEnrollmentId
          );
          return enrollment && request.status === "PENDING";
        }).length;

        return {
          offering,
          subject: subjectsById[offering.subjectId],
          academicGroup: academicGroups.find((group) => group.id === offering.academicGroupId),
          enrollments,
          coverage,
          pendingRequests,
          exceptionCount: enrollments.filter((item) => item.isException).length,
        };
      }),
    [academicGroups, getOfferingCoverage, getOfferingEnrollments, labChangeRequests, offerings, subjectsById]
  );

  const addOffering = () => {
    const result = createOffering({
      academicGroupId: selectedGroup,
      academicYear,
      semester,
      subjectId: selectedSubject,
      totalGrade,
    });

    if (!result.ok) {
      setFormMessage(result.message);
      return;
    }

    setFormMessage("Offering created. Students auto-enrolled and auto-placed into labs.");
    setSelectedGroup("");
    setSelectedSubject("");
    setAcademicYear("2026-2027");
    setSemester("Fall");
    setTotalGrade("16");
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Course Offerings</h1>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="placement-card-header">
            <div>
              <h3 style={{ marginBottom: "0.35rem" }}>Create offering</h3>
              <div className="placement-meta">
                Subject catalog stays global and usually comes from import. Creating offering is real
                operational step: subject + academic group + year + semester.
              </div>
            </div>
            <span className="status-badge status-badge-neutral">Subjects via import</span>
          </div>

          <div className="admin-form-grid">
            <select
              className="form-input"
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
            >
              <option value="">Select subject</option>
              {subjectCatalog.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>

            <select
              className="form-input"
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
            >
              <option value="">Select academic group</option>
              {academicGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.code}
                </option>
              ))}
            </select>

            <input
              className="form-input"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              placeholder="Academic year"
            />

            <select
              className="form-input"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            >
              <option value="Fall">Fall</option>
              <option value="Spring">Spring</option>
            </select>

            <input
              className="form-input"
              value={totalGrade}
              readOnly
              aria-label="Maximum lab points per midterm"
            />

            <button
              className="primary-button"
              disabled={!selectedGroup || !selectedSubject || !academicYear || !semester}
              onClick={addOffering}
            >
              Create Offering
            </button>
          </div>

          {formMessage && (
            <p className="student-helper-text" style={{ marginBottom: 0 }}>
              {formMessage}
            </p>
          )}
        </div>

        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Offering</th>
                <th>Group</th>
                <th>Auto Labs</th>
                <th>Students</th>
                <th>Teacher Coverage</th>
                <th>Exceptions</th>
                <th>Pending Requests</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {offeringRows.map((row) => (
                <tr key={row.offering.id}>
                  <td>
                    {row.subject.name}
                    <div className="placement-meta">
                      {row.offering.academicYear} • {row.offering.semester}
                    </div>
                  </td>
                  <td>{row.academicGroup.code}</td>
                  <td>{row.academicGroup.recommendedLabCount}</td>
                  <td>{row.enrollments.length}</td>
                  <td>
                    {row.coverage.coveredCount}/{row.coverage.totalCount}
                  </td>
                  <td>{row.exceptionCount}</td>
                  <td>{row.pendingRequests}</td>
                  <td>
                    <button
                      className={
                        row.offering.isActive ? "table-btn edit" : "table-btn delete"
                      }
                      onClick={() => toggleOfferingActive(row.offering.id)}
                    >
                      {row.offering.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                </tr>
              ))}

              {offeringRows.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center" }}>
                    No offerings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
