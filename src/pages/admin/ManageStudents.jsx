import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

// Example groups (with subgroups)
const initialGroups = [
  { id: 1, name: "TT319", subgroups: [1, 2, 3] },
  { id: 2, name: "TT320", subgroups: [1, 2] },
];

// Example students
const initialStudents = [
  { id: 1, name: "John Doe", email: "john@mail.com", groupId: 1, subgroupId: 1, status: "active" },
  { id: 2, name: "Anna Petrosyan", email: "anna@mail.com", groupId: 1, subgroupId: 2, status: "active" },
  { id: 3, name: "Mark Grigoryan", email: "mark@mail.com", groupId: 2, subgroupId: 1, status: "inactive" },
];

export default function ManageStudents() {
  const [groups] = useState(initialGroups);
  const [students, setStudents] = useState(initialStudents);

  // form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newSubgroup, setNewSubgroup] = useState("");

  const subgroupOptions = newGroup
    ? groups.find((g) => g.id === Number(newGroup))?.subgroups || []
    : [];

  const addStudent = () => {
    if (!newName || !newEmail || !newGroup || !newSubgroup) return;

    setStudents([
      ...students,
      {
        id: Date.now(),
        name: newName,
        email: newEmail,
        groupId: Number(newGroup),
        subgroupId: Number(newSubgroup),
        status: "active",
      },
    ]);

    // Reset
    setNewName("");
    setNewEmail("");
    setNewGroup("");
    setNewSubgroup("");
  };

  const toggleStatus = (id) => {
    setStudents(
      students.map((s) =>
        s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s
      )
    );
  };

  const deleteStudent = (id) => {
    setStudents(students.filter((s) => s.id !== id));
  };

  const changeGroup = (studentId, newGroupId) => {
    const g = groups.find((g) => g.id === Number(newGroupId));

    setStudents(
      students.map((s) =>
        s.id === studentId
          ? { ...s, groupId: Number(newGroupId), subgroupId: g.subgroups[0] }
          : s
      )
    );
  };

  const changeSubgroup = (studentId, newSubgroupId) => {
    setStudents(
      students.map((s) =>
        s.id === studentId ? { ...s, subgroupId: Number(newSubgroupId) } : s
      )
    );
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Manage Students</h1>

        {/* ADD STUDENT */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Add New Student</h3>

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
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
            >
              <option value="">Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              className="form-input"
              value={newSubgroup}
              onChange={(e) => setNewSubgroup(e.target.value)}
              disabled={!newGroup}
            >
              <option value="">Subgroup</option>
              {subgroupOptions.map((sg) => (
                <option key={sg} value={sg}>
                  SG{sg}
                </option>
              ))}
            </select>

            <button className="primary-button" onClick={addStudent}>
              Add
            </button>
          </div>
        </div>

        {/* STUDENTS TABLE */}
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Group</th>
                <th>Subgroup</th>
                <th>Status</th>
                <th style={{ width: "180px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.map((s) => {
                const group = groups.find((g) => g.id === s.groupId);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>

                    {/* CHANGE GROUP */}
                    <td>
                      <select
                        className="form-input"
                        value={s.groupId}
                        onChange={(e) => changeGroup(s.id, e.target.value)}
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* CHANGE SUBGROUP */}
                    <td>
                      <select
                        className="form-input"
                        value={s.subgroupId}
                        onChange={(e) => changeSubgroup(s.id, e.target.value)}
                      >
                        {group.subgroups.map((sg) => (
                          <option key={sg} value={sg}>
                            SG{sg}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* STATUS */}
                    <td>
                      <span
                        className={s.status === "active" ? "status-active" : "status-inactive"}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="table-btn edit"
                          onClick={() => toggleStatus(s.id)}
                        >
                          {s.status === "active" ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          className="table-btn delete"
                          onClick={() => deleteStudent(s.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {students.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    No students found
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
