import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../../layout/DashboardLayout.jsx";
import {
  studentName,
  subjects,
  progressMatrix,
} from "../../data/studentData.js";
import { labs } from "../../data/labData";


const VIEWS = {
  OVERVIEW: "overview",
  PROGRESS: "progress",
  SUBJECT_LABS: "subject_labs",
};

export default function StudentDashboard() {
  const location = useLocation();

  const [view, setView] = useState(VIEWS.OVERVIEW);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  useEffect(() => {
    setView(VIEWS.OVERVIEW);
    setSelectedSubjectId(null);
  }, [location.key]);
  
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
  const labIds = ["lab1", "lab2", "lab3"];

  // Get difficulty from labData.js (teacher source of truth)
  const getLabDifficulty = (subjectId, labId) => {
    const subjectLabs = labs[subjectId]?.TT319 || [];
    const lab = subjectLabs.find((l) => l.id === labId);
    return lab?.difficulty ?? 1;
  };

  const getAbsences = (subjectProgress) => {
    let count = 0;
    labIds.forEach((labId) => {
      if (subjectProgress[labId]?.attendance === "absent") {
        count++;
      }
    });
    return count;
  };

  const hasUngradedLab = (subjectProgress) => {
    return labIds.some((labId) => {
      const grade = subjectProgress[labId]?.grade;
      return grade === "empty" || grade === undefined;
    });
  };

  const calculateFinal16 = (subjectId, subjectProgress) => {
    if (hasUngradedLab(subjectProgress)) return "";

    let studentPoints = 0;
    let maxPoints = 0;

    labIds.forEach((labId) => {
      const grade = Number(subjectProgress[labId]?.grade ?? 0);
      const difficulty = getLabDifficulty(subjectId, labId);

      studentPoints += grade;
      maxPoints += difficulty;
    });

    if (maxPoints === 0) return "";
    return Math.round((studentPoints / maxPoints) * 16);
  };

  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>Progress Overview</h1>
      </header>

      <div className="student-card">
        <table className="progress-table">
          <thead>
            <tr>
              <th>Subject</th>

              {labIds.map((labId, index) => (
                <th key={labId}>
                  Lab {index + 1}
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Diff:{" "}
                    {getLabDifficulty(subjects[0].id, labId)}
                  </div>
                </th>
              ))}

              <th>Absences</th>
              <th>Midterm</th>
              <th>Final (0–16)</th>
            </tr>
          </thead>

          <tbody>
            {subjects.map((subject) => {
              const subjectProgress = progressMatrix[subject.id] || {};
              const absences = getAbsences(subjectProgress);
              const notAllowed = absences >= 3;
              const final16 = calculateFinal16(
                subject.id,
                subjectProgress
              );

              return (
                <tr key={subject.id}>
                  <td>{subject.name}</td>

                  {labIds.map((labId) => {
                    const entry = subjectProgress[labId] || {
                      grade: "empty",
                      attendance: "empty",
                    };

                    return (
                      <td key={labId}>
                        <div className="status-cell">
                          {/* Grade (read-only) */}
                          <div className="status-box status-empty">
                            {typeof entry.grade === "number" ? entry.grade : 0}
                          </div>

                          {/* Attendance */}
                          <div
                            className={
                              entry.attendance === "present"
                                ? "status-box attendance-present"
                                : entry.attendance === "absent"
                                ? "status-box attendance-absent"
                                : "status-box status-empty"
                            }
                          >
                            {entry.attendance === "present"
                              ? "Ն"
                              : entry.attendance === "absent"
                              ? "Բ"
                              : ""}
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  <td style={{ textAlign: "center" }}>{absences}</td>

                  <td style={{ textAlign: "center", fontWeight: 700 }}>
                    {notAllowed ? "Not allowed" : "Allowed"}
                  </td>

                  <td style={{ textAlign: "center" }}>
                    {notAllowed
                      ? "Not allowed"
                      : final16 === ""
                      ? "—"
                      : final16}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="legend">
        Grade: 0..Difficulty &nbsp; | &nbsp; Ն = Present &nbsp; | &nbsp; Բ = Absent
        &nbsp; | &nbsp; 3+ absences → Not allowed
      </p>
    </div>
  );
}
