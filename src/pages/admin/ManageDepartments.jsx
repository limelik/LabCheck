import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

export default function ManageDepartments() {
  const [departments, setDepartments] = useState([
    { id: 1, name: "Computer Science", short: "CS" },
    { id: 2, name: "Information Technology", short: "IT" },
    { id: 3, name: "Cybersecurity", short: "CYB" },
  ]);

  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptShort, setNewDeptShort] = useState("");

  const addDepartment = () => {
    if (!newDeptName.trim() || !newDeptShort.trim()) return;

    setDepartments([
      ...departments,
      {
        id: Date.now(),
        name: newDeptName,
        short: newDeptShort.toUpperCase(),
      },
    ]);

    setNewDeptName("");
    setNewDeptShort("");
  };

  const deleteDepartment = (id) => {
    setDepartments(departments.filter((d) => d.id !== id));
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Manage Departments</h1>

        {/* ADD DEPARTMENT FORM */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Add New Department</h3>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
            <input
              type="text"
              placeholder="Department Name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Short Code (e.g., CS)"
              value={newDeptShort}
              onChange={(e) => setNewDeptShort(e.target.value)}
              className="form-input"
            />
            <button className="primary-button" onClick={addDepartment}>
              Add
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Short Code</th>
                <th style={{ width: "120px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td>{dept.name}</td>
                  <td>{dept.short}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="table-btn edit">Edit</button>
                      <button
                        className="table-btn delete"
                        onClick={() => deleteDepartment(dept.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {departments.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center" }}>
                    No departments found
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
