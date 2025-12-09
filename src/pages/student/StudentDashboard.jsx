import { useMemo, useState } from "react";
import DashboardLayout from "../../layout/DashboardLayout.jsx";
import {
  studentName,
  subjects,
  progressMatrix,
} from "../../data/studentData.js";
import StudentStatusCell from "../../components/StudentStatusCell.jsx";

const VIEWS = {
  OVERVIEW: "overview",
  PROGRESS: "progress",
  SUBJECT_LABS: "subject_labs",
};

export default function StudentDashboard() {
  const [view, setView] = useState(VIEWS.OVERVIEW);
  const [selectedSubjectId, setSelectedSubjectId] = useState("cyber");

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [selectedSubjectId]
  );

  // simple counts for quick stats
  const { completedCount, pendingCount } = useMemo(() => {
    let completed = 0;
    let pending = 0;

    Object.values(progressMatrix).forEach((labs) => {
      Object.values(labs).forEach(({ status }) => {
        if (status === "completed") completed++;
        else if (status === "pending") pending++;
      });
    });

    return { completedCount: completed, pendingCount: pending };
  }, []);

  return (
    <DashboardLayout>
      <div className="student-layout">
        {/* Left: subject sidebar */}
        <aside className="student-sidebar">
          <h3 className="sidebar-section-title">My Subjects</h3>
          <div className="student-subject-list">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                className={
                  "subject-pill" +
                  (subject.id === selectedSubjectId ? " subject-pill-active" : "")
                }
                onClick={() => {
                  setSelectedSubjectId(subject.id);
                  setView(VIEWS.SUBJECT_LABS);
                }}
              >
                {subject.name}
              </button>
            ))}
          </div>

          <div className="student-sidebar-divider" />

          <button
            className={
              "subject-pill" +
              (view === VIEWS.PROGRESS ? " subject-pill-active" : "")
            }
            onClick={() => setView(VIEWS.PROGRESS)}
          >
             📊 Progress Overview
          </button>
        </aside>

        {/* Right: main panel */}
        <section className="student-main">
          {view === VIEWS.OVERVIEW && (
            <StudentOverview
              onGoToProgress={() => setView(VIEWS.PROGRESS)}
              completedCount={completedCount}
              pendingCount={pendingCount}
            />
          )}

          {view === VIEWS.SUBJECT_LABS && selectedSubject && (
            <SubjectLabs subject={selectedSubject} />
          )}

          {view === VIEWS.PROGRESS && (
            <StudentProgressOverview
              subjects={subjects}
              progressMatrix={progressMatrix}
            />
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

// --- Subcomponents ---

function StudentOverview({ onGoToProgress, completedCount, pendingCount }) {
  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>Welcome, {studentName}!</h1>
        <button className="text-button">Logout</button>
      </header>

      <div className="student-card">
        <h2 className="student-card-title">Quick Stats</h2>
        <div className="quick-stats-row">
          <button className="quick-stat-card quick-stat-completed" onClick={onGoToProgress}>
            <div className="quick-stat-label">Completed Labs</div>
            <div className="quick-stat-value">{completedCount}</div>
          </button>

          <button className="quick-stat-card quick-stat-pending" onClick={onGoToProgress}>
            <div className="quick-stat-label">Pending Labs</div>
            <div className="quick-stat-value">{pendingCount}</div>
          </button>
        </div>
      </div>

      <p className="student-helper-text">
        Select a subject from the sidebar to view your lab assignments.
      </p>
    </div>
  );
}

function SubjectLabs({ subject }) {
  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>{subject.name} – Lab Assignments</h1>
        <button className="text-button">Logout</button>
      </header>

      <div className="lab-list">
        {subject.labs.map((lab) => (
          <article key={lab.id} className="lab-card">
            <h3 className="lab-title">{lab.title}</h3>
            {lab.description && (
              <p className="lab-description">{lab.description}</p>
            )}

            {lab.hasFiles && (
              <div className="lab-actions">
                <button className="primary-button">Download Files</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function StudentProgressOverview({ subjects, progressMatrix }) {
  const labIds = ["lab1", "lab2", "lab3"]; // simple fixed 3 labs

  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>Progress Overview</h1>
        <button className="text-button">Logout</button>
      </header>

      <div className="student-card">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Subject</th>
              {labIds.map((labId, index) => (
                <th key={labId}>Lab {index + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td>{subject.name}</td>
                {labIds.map((labId) => {
                  const cell = progressMatrix[subject.id]?.[labId] || {
                    status: "empty",
                    attendance: "none",
                  };
                  return (
                    <td key={labId}>
                      <StudentStatusCell
                        status={cell.status}
                        attendance={cell.attendance}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="legend">
        ✔ = Completed, ✖ = Incomplete, empty = Not graded &nbsp; | &nbsp;
        Ն = Present, Բ = Absent, empty = Not marked
      </p>
    </div>
  );
}
