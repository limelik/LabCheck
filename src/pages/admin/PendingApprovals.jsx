import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

export default function PendingApprovals() {
  // Fake pending users (later can be replaced with API)
  const [pendingUsers, setPendingUsers] = useState([
    { id: 1, email: "student1@mail.com", role: "Student", group: "TT319" },
    { id: 2, email: "teacher1@mail.com", role: "Teacher", department: "CS" },
    { id: 3, email: "student2@mail.com", role: "Student", group: "TT320" },
  ]);

  const approveUser = (id) => {
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const rejectUser = (id) => {
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
  };

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
                <th>Role</th>
                <th>Group / Department</th>
                <th style={{ width: "150px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "1rem" }}>
                    ✔ All users have been approved!
                  </td>
                </tr>
              ) : (
                pendingUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.group || user.department}</td>
                    <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                        className="table-btn edit"
                        onClick={() => approveUser(user.id)}
                        >
                        Approve
                        </button>

                        <button
                        className="table-btn delete"
                        onClick={() => rejectUser(user.id)}
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
