import { useState } from "react";
import AdminSidebar from "./AdminSidebar";

// Example initial groups
const initialGroups = [
  { id: 1, name: "TT319" },
  { id: 2, name: "TT320" },
];

// Example initial subjects
const initialSubjects = [
  { id: 1, name: "Cybersecurity" },
  { id: 2, name: "Data Structures" },
  { id: 3, name: "Operating Systems" },
];

export default function AssignSubjects() {
  const [groups] = useState(initialGroups);
  const [subjects] = useState(initialSubjects);

  const [assignments, setAssignments] = useState([
    { id: 1, groupId: 1, subjectId: 1, semester: "Fall" },
    { id: 2, groupId: 2, subjectId: 1, semester: "Spring" },
  ]);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [semester, setSemester] = useState("");

  const addAssignment = () => {
    if (!selectedGroup || !selectedSubject || !semester) return;

    setAssignments([
      ...assignments,
      {
        id: Date.now(),
        groupId: Number(selectedGroup),
        subjectId: Number(selectedSubject),
        semester,
      },
    ]);

    setSelectedGroup("");
    setSelectedSubject("");
    setSemester("");
  };

  const deleteAssignment = (id) => {
    setAssignments(assignments.filter((a) => a.id !== id));
  };

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Assign Subjects to Groups</h1>

        {/* ASSIGN FORM */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Assign Subject</h3>

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
            {/* Select Group */}
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

            {/* Select Subject */}
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

            {/* Semester */}
            <select
              className="form-input"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="">Semester</option>
              <option value="Fall">Fall</option>
              <option value="Spring">Spring</option>
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
                <th>Group</th>
                <th>Subject</th>
                <th>Semester</th>
                <th style={{ width: "120px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>{groups.find((g) => g.id === a.groupId)?.name}</td>
                  <td>{subjects.find((s) => s.id === a.subjectId)?.name}</td>
                  <td>{a.semester}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="table-btn delete" onClick={() => deleteAssignment(a.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {assignments.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    No assignments found
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
