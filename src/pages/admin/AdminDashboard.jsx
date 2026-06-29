import { useMemo } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

export default function AdminDashboard() {
  const {
    academicGroups,
    academicUnits,
    enrollments,
    getOfferingCoverage,
    labChangeRequests,
    offerings,
    specializations,
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
      offerings: offerings.length,
      enrollments: enrollments.length,
      pendingRequestCount,
      uncoveredRows,
      activeOfferings: offerings.filter((offering) => offering.isActive).length,
    };
  }, [academicGroups.length, academicUnits.length, enrollments.length, getOfferingCoverage, labChangeRequests, offerings, specializations.length]);

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
              <div>
                <h2 className="student-card-title" style={{ marginBottom: "0.35rem" }}>
                  Operational Focus
                </h2>
                <div className="placement-meta">
                  Admin owns structure, offerings, and teacher coverage. Placements stay system-driven.
                </div>
              </div>
              <span className="placement-chip">{dashboard.activeOfferings} active offerings</span>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Meaning</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{dashboard.offerings} offerings</td>
                  <td>Teaching instances already created for group + year + semester.</td>
                  <td>Use Course Offerings page for create/monitor.</td>
                </tr>
                <tr>
                  <td>{dashboard.enrollments} auto enrollments</td>
                  <td>Students placed from academic group membership and surname ordering.</td>
                  <td>No manual placement UI needed.</td>
                </tr>
                <tr>
                  <td>{dashboard.uncoveredRows.length} coverage gaps</td>
                  <td>Offerings with one or more lab groups lacking teacher assignment.</td>
                  <td>Fix in Teacher Coverage page.</td>
                </tr>
                <tr>
                  <td>{dashboard.pendingRequestCount} student requests</td>
                  <td>Teacher-facing queue items waiting for lab-change decision.</td>
                  <td>Teachers handle them; admin monitors only.</td>
                </tr>
              </tbody>
            </table>
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
                      <td>{row.offering.id}</td>
                      <td>
                        {row.coveredCount}/{row.totalCount}
                      </td>
                      <td>{row.uncoveredLabIds.join(", ")}</td>
                      <td>
                        <span className="status-badge status-badge-pending">Needs teacher</span>
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
