import { useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import { api } from "../../api/client.js";
export default function StudentPlacement() {
  const { academicGroups, offerings, getOfferingEnrollments, refresh } =
    useLabChange();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function reconcile(group) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(`/admin/academic-groups/${group.id}/reconcile`, {
        method: "POST",
      });
      await refresh();
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="student-layout">
      <AdminSidebar />
      <main className="student-main">
        <h1>Student Placement</h1>
        <p>
          Placement uses the entire trusted cohort, sorted by surname and
          distributed evenly across subgroups. Reconciliation fills missing
          enrollments and retains existing placements and approved changes.
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {academicGroups.map((group) => (
          <section className="student-card" key={group.id}>
            <h2>
              {group.code} · {group.studentCount} students
            </h2>
            <button disabled={busy} onClick={() => reconcile(group)}>
              Reconcile {group.code}
            </button>
            {offerings
              .filter((o) => o.academicGroupId === group.id)
              .map((o) => (
                <div key={o.id}>
                  <h3>
                    {o.subjectName} · {o.academicYear} {o.semester}
                  </h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Default subgroup</th>
                        <th>Current subgroup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getOfferingEnrollments(o.id).map((p) => (
                        <tr key={p.enrollment.id}>
                          <td>{p.studentName}</td>
                          <td>{p.defaultLabGroup?.code}</td>
                          <td>
                            {p.currentLabGroup?.code}
                            {p.isException ? " (approved change)" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </section>
        ))}
      </main>
    </div>
  );
}
