import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

// Example departments
const initialDepartments = [
  { id: 1, name: "Computer Science", short: "CS" },
  { id: 2, name: "Information Technology", short: "IT" },
  { id: 3, name: "Cybersecurity", short: "CYB" },
];

// Example teachers
const initialTeachers = [
  { id: 1, name: "Arman Petrosyan", email: "arman@polytechnic.am", departmentId: 1, status: "active" },
  { id: 2, name: "Lilit Harutyunyan", email: "lilit@polytechnic.com", departmentId: 3, status: "inactive" },
];

export default function ManageTeachers() {
  const [departments] = useState(initialDepartments);
  const [teachers, setTeachers] = useState(initialTeachers);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("");

  const addTeacher = () => {
    if (!newName || !newEmail || !newDept) return;

    setTeachers([
      ...teachers,
      {
        id: Date.now(),
        name: newName,
        email: newEmail,
        departmentId: Number(newDept),
        status: "active",
      },
    ]);

    setNewName("");
    setNewEmail("");
    setNewDept("");
  };

  const changeDepartment = (id, deptId) => {
    setTeachers(
      teachers.map((t) =>
        t.id === id ? { ...t, departmentId: Number(deptId) } : t
      )
    );
  };

  const toggleStatus = (id) => {
    setTeachers(
      teachers.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "active" ? "inactive" : "active" }
          : t
      )
    );
  };

  const deleteTeacher = (id) => {
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Manage Teachers</h1>

        {/* ADD TEACHER FORM */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Add New Teacher</h3>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
            <input
              type="text"
              placeholder="Full Name"
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email"
              className="form-input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />

            <select
              className="form-input"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
            >
              <option value="">Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button className="primary-button" onClick={addTeacher}>
              Add
            </button>
          </div>
        </div>

        {/* TEACHER TABLE */}
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ width: "180px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.email}</td>

                  {/* CHANGE DEPARTMENT */}
                  <td>
                    <select
                      className="form-input"
                      value={t.departmentId}
                      onChange={(e) => changeDepartment(t.id, e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* STATUS */}
                  <td>
                    <span
                      className={t.status === "active" ? "status-active" : "status-inactive"}
                    >
                      {t.status}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="table-btn edit" onClick={() => toggleStatus(t.id)}>
                        {t.status === "active" ? "Deactivate" : "Activate"}
                      </button>

                      <button className="table-btn delete" onClick={() => deleteTeacher(t.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {teachers.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No teachers found
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
