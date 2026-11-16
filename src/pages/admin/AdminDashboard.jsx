import { useMemo } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

export default function AdminDashboard() {
  const {
    academicGroups,
    academicUnits,
    getOfferingCoverage,
    labChangeRequests,
    offerings,
    specializations,
    subjectsById,
  } = useLabChange();

  const dashboard = useMemo(() => {
    const coverageRows = offerings
      .map((offering) => getOfferingCoverage(offering.id))
      .filter(Boolean);

    const uncoveredRows = coverageRows.filter((row) => !row.isFullyCovered);
    const pendingRequestCount = labChangeRequests.filter(
      (request) => request.status === "PENDING"
    ).length;

    return {
      units: academicUnits.length,
      specializations: specializations.length,
      academicGroups: academicGroups.length,
      pendingRequestCount,
      uncoveredRows,
    };
  }, [academicGroups.length, academicUnits.length, getOfferingCoverage, labChangeRequests, offerings, specializations.length]);

  return (
    <div className="student-layout">
      <AdminSidebar />

      <div className="student-main">
        <div className="student-panel">
          <h1>Academic Control Panel</h1>

          <div className="quick-stats-row">
            <div className="quick-stat-card quick-stat-completed">
              <div className="quick-stat-label">Academic Units</div>
              <div className="quick-stat-value">{dashboard.units}</div>
            </div>

            <div className="quick-stat-card" style={{ background: "#e0f2fe" }}>
              <div className="quick-stat-label">Specializations</div>
              <div className="quick-stat-value">{dashboard.specializations}</div>
            </div>

            <div className="quick-stat-card" style={{ background: "#fee2e2" }}>
              <div className="quick-stat-label">Academic Groups</div>
              <div className="quick-stat-value">{dashboard.academicGroups}</div>
            </div>

            <div className="quick-stat-card quick-stat-pending">
              <div className="quick-stat-label">Pending Lab Changes</div>
              <div className="quick-stat-value">{dashboard.pendingRequestCount}</div>
            </div>
          </div>

          <div className="student-card" style={{ marginTop: "1.5rem" }}>
            <div className="placement-card-header">
              <h2 className="student-card-title" style={{ marginBottom: 0 }}>
                Coverage Alerts
              </h2>
              <span className="placement-chip">{dashboard.uncoveredRows.length} alerts</span>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Offering</th>
                  <th>Covered Labs</th>
                  <th>Missing Labs</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.uncoveredRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      All offerings fully covered.
                    </td>
                  </tr>
                ) : (
                  dashboard.uncoveredRows.map((row) => (
                    <tr key={row.offering.id}>
                      <td>
                        <Link className="coverage-alert-link" to={`/admin/teacher-coverage?offering=${row.offering.id}`}>
                          {subjectsById[row.offering.subjectId]?.name ?? row.offering.subjectId}
                        </Link>
                        <div className="placement-meta">
                          {row.offering.academicGroupId} · {row.offering.academicYear} · {row.offering.semester}
                        </div>
                      </td>
                      <td>
                        {row.coveredCount}/{row.totalCount}
                      </td>
                      <td>{row.uncoveredLabIds.join(", ")}</td>
                      <td>
                        <Link className="table-btn edit" to={`/admin/teacher-coverage?offering=${row.offering.id}`}>
                          Assign teacher
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
