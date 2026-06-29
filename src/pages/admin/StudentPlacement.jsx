import { useMemo } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

function countByLabGroup(enrichedEnrollments) {
  return enrichedEnrollments.reduce((counts, item) => {
    counts[item.currentLabGroup.id] = (counts[item.currentLabGroup.id] ?? 0) + 1;
    return counts;
  }, {});
}

export default function StudentPlacement() {
  const {
    academicGroupsById,
    enrollments,
    getEnrichedEnrollment,
    subjectOfferings,
    subjectsById,
  } = useLabChange();

  const placementCards = useMemo(
    () =>
      subjectOfferings.map((offering) => {
        const offeringEnrollments = enrollments
          .filter((enrollment) => enrollment.subjectOfferingId === offering.id)
          .map(getEnrichedEnrollment);

        return {
          offering,
          subject: subjectsById[offering.subjectId],
          academicGroup: academicGroupsById[offering.academicGroupId],
          offeringEnrollments,
          distribution: countByLabGroup(offeringEnrollments),
          exceptionCount: offeringEnrollments.filter((item) => item.isException).length,
        };
      }),
    [academicGroupsById, enrollments, getEnrichedEnrollment, subjectOfferings, subjectsById]
  );

  const exceptionRows = useMemo(
    () =>
      enrollments
        .map(getEnrichedEnrollment)
        .filter((item) => item.isException)
        .sort((left, right) => left.student.lastName.localeCompare(right.student.lastName)),
    [enrollments, getEnrichedEnrollment]
  );

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Student Placement</h1>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>System-driven placement</h3>
          <p className="student-helper-text" style={{ margin: 0 }}>
            Students auto-assign by academic group, surname order, then round-robin across lab
            groups. Manual per-student placement removed. Source of truth stays in
            `student_subject_enrollments.lab_group_id`.
          </p>
        </div>

        <div className="placement-grid">
          {placementCards.map((card) => (
            <section key={card.offering.id} className="student-card placement-card">
              <div className="placement-card-header">
                <div>
                  <h2 className="student-card-title" style={{ marginBottom: "0.35rem" }}>
                    {card.subject.name}
                  </h2>
                  <div className="placement-meta">
                    {card.academicGroup.code} • {card.offering.academicYear} • {card.offering.semester}
                  </div>
                </div>
                <span className="placement-chip">
                  {card.offeringEnrollments.length} students
                </span>
              </div>

              <div className="placement-distribution">
                {card.academicGroup.labGroupIds.map((labGroupId) => (
                  <div key={labGroupId} className="placement-stat">
                    <div className="placement-stat-label">{labGroupId}</div>
                    <div className="placement-stat-value">
                      {card.distribution[labGroupId] ?? 0}
                    </div>
                  </div>
                ))}
              </div>

              <div className="placement-summary-row">
                <span className="status-badge status-badge-neutral">Auto baseline locked</span>
                <span className="placement-meta">
                  Exceptions: {card.exceptionCount}
                </span>
              </div>
            </section>
          ))}
        </div>

        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="placement-card-header">
            <div>
              <h3 style={{ marginBottom: "0.35rem" }}>Exceptions only</h3>
              <div className="placement-meta">
                Only approved changes appear here. Pending requests keep current placement unchanged.
              </div>
            </div>
            <span className="placement-chip">{exceptionRows.length} exceptions</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject Offering</th>
                <th>Default Lab</th>
                <th>Current Lab</th>
                <th>State</th>
              </tr>
            </thead>

            <tbody>
              {exceptionRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No approved exceptions yet.
                  </td>
                </tr>
              ) : (
                exceptionRows.map((row) => (
                  <tr key={row.enrollment.id}>
                    <td>{row.studentName}</td>
                    <td>
                      {row.subject.name} ({row.academicGroup.code})
                    </td>
                    <td>{row.defaultLabGroup.code}</td>
                    <td>{row.currentLabGroup.code}</td>
                    <td>
                      <span className="status-badge status-badge-approved">Approved override</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
