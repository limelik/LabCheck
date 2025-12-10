// src/pages/admin/PendingApprovals.jsx
import AdminSidebar from "./AdminSidebar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function PendingApprovals() {
  const { pendingUsers, approveUser, rejectUser } = useAuth();

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Pending Approvals</h1>

        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Group / Dept</th>
                <th style={{ width: "190px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "1rem" }}>
                    ✔ All users have been approved!
                  </td>
                </tr>
              ) : (
                pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.name}</td>
                    <td>{u.role}</td>
                    <td>{u.groupId || u.departmentId || "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="table-btn edit"
                          onClick={() => approveUser(u.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="table-btn delete"
                          onClick={() => rejectUser(u.id)}
                        >
                          Reject
                        </button>
                      </div>
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
