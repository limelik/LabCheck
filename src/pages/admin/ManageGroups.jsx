import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

// Example departments (later fetched from ManageDepartments)
const initialDepartments = [
  { id: 1, name: "Computer Science", short: "CS" },
  { id: 2, name: "Information Technology", short: "IT" },
  { id: 3, name: "Cybersecurity", short: "CYB" },
];

export default function ManageGroups() {
  const [departments] = useState(initialDepartments);

  const [groups, setGroups] = useState([
    { id: 1, name: "TT319", departmentId: 1, year: 3, subgroups: [1] },
    { id: 2, name: "TT320", departmentId: 1, year: 3, subgroups: [1] },
  ]);

  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newYear, setNewYear] = useState("");

  const addGroup = () => {
    if (!newName || !newDept || !newYear) return;

    setGroups([
      ...groups,
      {
        id: Date.now(),
        name: newName.toUpperCase(),
        departmentId: Number(newDept),
        year: Number(newYear),
        subgroups: [1], // default subgroup 1
      },
    ]);

    setNewName("");
    setNewDept("");
    setNewYear("");
  };

  const addSubgroup = (groupId) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, subgroups: [...g.subgroups, g.subgroups.length + 1] }
          : g
      )
    );
  };

  const removeSubgroup = (groupId, subId) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              subgroups:
                g.subgroups.length > 1
                  ? g.subgroups.filter((s) => s !== subId)
                  : g.subgroups,
            }
          : g
      )
    );
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Manage Groups</h1>

        {/* ADD GROUP FORM */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Add New Group</h3>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
            <input
              type="text"
              placeholder="Group Name (e.g., TT319)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="form-input"
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

            <input
              type="number"
              placeholder="Year"
              className="form-input"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
            />

            <button className="primary-button" onClick={addGroup}>
              Add
            </button>
          </div>
        </div>

        {/* GROUP TABLE */}
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Department</th>
                <th>Year</th>
                <th>Subgroups</th>
                <th style={{ width: "150px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>

                  <td>
                    {departments.find((d) => d.id === g.departmentId)?.name ||
                      "Unknown"}
                  </td>

                  <td>{g.year}</td>

                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {g.subgroups.map((sub) => (
                        <div
                          key={sub}
                          className="subgroup-pill"
                          style={{
                            background: "#e5e7eb",
                            borderRadius: "8px",
                            padding: "4px 8px",
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          Lab{sub}
                          {g.subgroups.length > 1 && (
                            <button
                              onClick={() => removeSubgroup(g.id, sub)}
                              style={{
                                marginLeft: "6px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                              }}
                            >
                              ✖
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        className="small-button"
                        onClick={() => addSubgroup(g.id)}
                      >
                        ➕ Add
                      </button>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="table-btn edit">Edit</button>
                      <button className="table-btn delete">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}

              {groups.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No groups found
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
