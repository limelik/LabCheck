import AdminSidebar from "./AdminSidebar";
import { useState } from "react";

export default function PendingApprovals() {
  const [pendingUsers, setPendingUsers] = useState([
    { id: 1, email: "student1@polytechnic.am", role: "Student", group: "TT319" },
    { id: 2, email: "teacher1@polytechnic.am", role: "Teacher", department: "CS" },
    { id: 3, email: "student2@polytechnic.am", role: "Student", group: "TT320" },
  ]);

  const approveUser = (id) => {
    setPendingUsers(pendingUsers.filter((u) => u.id !== id));
  };

  const rejectUser = (id) => {
    setPendingUsers(pendingUsers.filter((u) => u.id !== id));
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
                <th style={{ width: "160px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "1rem" }}>
                    ✔ All users approved!
                  </td>
                </tr>
              ) : (
                pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.group || u.department}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="table-btn edit" onClick={() => approveUser(u.id)}>
                          Approve
                        </button>
                        <button className="table-btn delete" onClick={() => rejectUser(u.id)}>
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
