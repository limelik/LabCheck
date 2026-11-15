import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { apiRequest } from "../../lib/api.js";

export default function PendingApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { users } = await apiRequest("/api/admin/approvals");
      setPendingUsers(users);
    } catch (err) {
      setError(err.message || "Could not load pending approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const decide = async (id, status) => {
    setError("");
    try {
      await apiRequest(`/api/admin/approvals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (err) {
      setError(err.message || "Could not update the account.");
    }
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />
      <main className="teacher-main">
        <h1 className="page-title">Pending Approvals</h1>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Group</th>
                <th style={{ width: "160px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: "center" }}>Loading approvals...</td></tr>
              ) : pendingUsers.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center" }}>No pending approvals.</td></tr>
              ) : pendingUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.groupCode || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="table-btn edit" onClick={() => decide(user.id, "APPROVED")}>
                        Approve
                      </button>
                      <button className="table-btn delete" onClick={() => decide(user.id, "REJECTED")}>
                        Reject
                      </button>
                    </div>
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
