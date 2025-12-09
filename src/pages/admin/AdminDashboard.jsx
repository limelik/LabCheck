import AdminSidebar from "./AdminSidebar.jsx";

export default function AdminDashboard() {
  return (
    <div className="student-layout">
      <AdminSidebar />

      <div className="student-main">
        <div className="student-panel">
          <h1>Admin Dashboard</h1>

          <div className="quick-stats-row">
            <div className="quick-stat-card quick-stat-completed">
              <div className="quick-stat-label">Total Students</div>
              <div className="quick-stat-value">320</div>
            </div>

            <div className="quick-stat-card quick-stat-pending">
              <div className="quick-stat-label">Pending Approvals</div>
              <div className="quick-stat-value">12</div>
            </div>

            <div className="quick-stat-card" style={{ background: "#dbeafe" }}>
              <div className="quick-stat-label">Total Teachers</div>
              <div className="quick-stat-value">27</div>
            </div>

            <div className="quick-stat-card" style={{ background: "#fee2e2" }}>
              <div className="quick-stat-label">Total Subjects</div>
              <div className="quick-stat-value">14</div>
            </div>
          </div>

          <div className="student-card" style={{ marginTop: "1.5rem" }}>
            <h2 className="student-card-title">Recent Registrations</h2>
            <p>This table will show latest users waiting for approval.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
