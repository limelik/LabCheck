import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

// Example initial data
const initialTeachers = [
  { id: 1, name: "Mark Petrosyan", departmentId: 1 },
  { id: 2, name: "Anna Harutyunyan", departmentId: 3 },
];

const initialSubjects = [
  { id: 1, name: "Cybersecurity" },
  { id: 2, name: "Data Structures" },
];

const initialGroups = [
  { id: 1, name: "TT319", subgroups: [1, 2, 3] },
  { id: 2, name: "TT320", subgroups: [1, 2] },
];

export default function AssignTeachers() {
  const [teachers] = useState(initialTeachers);
  const [subjects] = useState(initialSubjects);
  const [groups] = useState(initialGroups);

  const [assignments, setAssignments] = useState([]);

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSubgroup, setSelectedSubgroup] = useState("");

  // Assign teacher
  const addAssignment = () => {
    if (!selectedTeacher || !selectedSubject || !selectedGroup || !selectedSubgroup) return;

    setAssignments([
      ...assignments,
      {
        id: Date.now(),
        teacherId: Number(selectedTeacher),
        subjectId: Number(selectedSubject),
        groupId: Number(selectedGroup),
        subgroupId: Number(selectedSubgroup),
      },
    ]);

    // Clear selections
    setSelectedTeacher("");
    setSelectedSubject("");
    setSelectedGroup("");
    setSelectedSubgroup("");
  };

  const deleteAssignment = (id) => {
    setAssignments(assignments.filter((a) => a.id !== id));
  };

  const subgroupOptions = selectedGroup
    ? groups.find((g) => g.id === Number(selectedGroup))?.subgroups || []
    : [];

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Assign Teachers to Subjects</h1>

        {/* FORM */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Assign Teacher</h3>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
            {/* Teacher dropdown */}
            <select
              className="form-input"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="">Select Teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Subject dropdown */}
            <select
              className="form-input"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Group dropdown */}
            <select
              className="form-input"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Subgroup dropdown */}
            <select
              className="form-input"
              value={selectedSubgroup}
              onChange={(e) => setSelectedSubgroup(e.target.value)}
              disabled={!selectedGroup}
            >
              <option value="">Lab</option>
              {subgroupOptions.map((sg) => (
                <option key={sg} value={sg}>
                  Lab {sg}
                </option>
              ))}
            </select>

            <button className="primary-button" onClick={addAssignment}>
              Assign
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Group</th>
                <th>Lab</th>
                <th style={{ width: "120px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>{teachers.find((t) => t.id === a.teacherId)?.name}</td>
                  <td>{subjects.find((s) => s.id === a.subjectId)?.name}</td>
                  <td>{groups.find((g) => g.id === a.groupId)?.name}</td>
                  <td>{a.subgroupId}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="table-btn delete"
                        onClick={() => deleteAssignment(a.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {assignments.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No teacher assignments yet
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
