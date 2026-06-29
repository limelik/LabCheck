import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

const initialDepartments = [
  { id: 1, name: "Computer Science", short: "CS" },
  { id: 2, name: "Information Technology", short: "IT" },
  { id: 3, name: "Cybersecurity", short: "CYB" },
];

export default function ManageSubjects() {
  const [departments] = useState(initialDepartments);

  const [subjects, setSubjects] = useState([
    { id: 1, name: "Cybersecurity", departmentId: 3 },
    { id: 2, name: "Data Structures", departmentId: 1 },
  ]);

  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");

  const addSubject = () => {
    if (!newName.trim() || !newDept) return;

    setSubjects([
      ...subjects,
      {
        id: Date.now(),
        name: newName.trim(),
        departmentId: Number(newDept),
      },
    ]);

    setNewName("");
    setNewDept("");
  };

  const deleteSubject = (id) => {
    setSubjects(subjects.filter((s) => s.id !== id));
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Manage Subjects</h1>

        {/* ADD SUBJECT */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Add New Subject</h3>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
            <input
              type="text"
              placeholder="Subject Name"
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
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

            <button className="primary-button" onClick={addSubject}>
              Add
            </button>
          </div>
        </div>

        {/* SUBJECT TABLE */}
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Department</th>
                <th style={{ width: "150px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>

                  <td>
                    {departments.find((d) => d.id === s.departmentId)?.name ||
                      "Unknown"}
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="table-btn edit">Edit</button>
                      <button
                        className="table-btn delete"
                        onClick={() => deleteSubject(s.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {subjects.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center" }}>
                    No subjects found
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
