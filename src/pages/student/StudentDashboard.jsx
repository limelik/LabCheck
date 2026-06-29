import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../../layout/DashboardLayout.jsx";
import { progressMatrix, subjects } from "../../data/studentData.js";
import { labs } from "../../data/labData.js";
import { useLabChange } from "../../context/LabChangeContext.jsx";

const VIEWS = {
  OVERVIEW: "overview",
  PROGRESS: "progress",
  REQUESTS: "requests",
  SUBJECT_LABS: "subject_labs",
};

function getStatusBadgeClass(status) {
  if (status === "APPROVED") return "status-badge status-badge-approved";
  if (status === "REJECTED") return "status-badge status-badge-rejected";
  if (status === "PENDING") return "status-badge status-badge-pending";
  return "status-badge status-badge-neutral";
}

function formatStatusLabel(request) {
  return request?.status ?? "NO REQUEST";
}

export default function StudentDashboard() {
  const location = useLocation();
  const {
    createLabChangeRequest,
    currentStudent,
    enrollments,
    getEnrichedEnrollment,
  } = useLabChange();

  const [view, setView] = useState(VIEWS.OVERVIEW);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  useEffect(() => {
    setView(VIEWS.OVERVIEW);
    setSelectedSubjectId(null);
  }, [location.key]);

  const subjectPlacements = useMemo(
    () =>
      enrollments
        .filter((enrollment) => enrollment.studentId === currentStudent.id)
        .map(getEnrichedEnrollment)
        .sort((left, right) => left.subject.name.localeCompare(right.subject.name)),
    [currentStudent.id, enrollments, getEnrichedEnrollment]
  );

  const selectedPlacement = useMemo(
    () => subjectPlacements.find((item) => item.subject.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjectPlacements]
  );

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
    [selectedSubjectId]
  );

  const { completedCount, pendingCount, pendingRequestCount } = useMemo(() => {
    let completed = 0;
    let pending = 0;

    Object.values(progressMatrix).forEach((subjectLabs) => {
      Object.values(subjectLabs).forEach(({ status }) => {
        if (status === "completed") completed++;
        else if (status === "pending") pending++;
      });
    });

    return {
      completedCount: completed,
      pendingCount: pending,
      pendingRequestCount: subjectPlacements.filter(
        (item) => item.latestRequest?.status === "PENDING"
      ).length,
    };
  }, [subjectPlacements]);

  return (
    <DashboardLayout>
      <div className="student-layout">
        <aside className="student-sidebar">
          <h3 className="sidebar-section-title">My Subjects</h3>
          <div className="student-subject-list">
            {subjectPlacements.map((placement) => (
              <button
                key={placement.enrollment.id}
                className={
                  "subject-pill" +
                  (placement.subject.id === selectedSubjectId ? " subject-pill-active" : "")
                }
                onClick={() => {
                  setSelectedSubjectId(placement.subject.id);
                  setView(VIEWS.SUBJECT_LABS);
                }}
              >
                {placement.subject.name}
              </button>
            ))}
          </div>

          <div className="student-sidebar-divider" />

          <button
            className={
              "subject-pill" + (view === VIEWS.PROGRESS ? " subject-pill-active" : "")
            }
            onClick={() => setView(VIEWS.PROGRESS)}
          >
            Progress Overview
          </button>

          <button
            className={
              "subject-pill" + (view === VIEWS.REQUESTS ? " subject-pill-active" : "")
            }
            onClick={() => setView(VIEWS.REQUESTS)}
            style={{ marginTop: "0.5rem" }}
          >
            Lab Change Requests
          </button>
        </aside>

        <section className="student-main">
          {view === VIEWS.OVERVIEW && (
            <StudentOverview
              completedCount={completedCount}
              pendingCount={pendingCount}
              pendingRequestCount={pendingRequestCount}
              studentName={`${currentStudent.firstName} ${currentStudent.lastName}`}
              subjectPlacements={subjectPlacements}
            />
          )}

          {view === VIEWS.SUBJECT_LABS && selectedSubject && selectedPlacement && (
            <SubjectLabs placement={selectedPlacement} subject={selectedSubject} />
          )}

          {view === VIEWS.REQUESTS && (
            <StudentRequestPage
              createLabChangeRequest={createLabChangeRequest}
              subjectPlacements={subjectPlacements}
            />
          )}

          {view === VIEWS.PROGRESS && (
            <StudentProgressOverview progressMatrix={progressMatrix} subjects={subjects} />
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function StudentOverview({
  completedCount,
  pendingCount,
  pendingRequestCount,
  studentName,
  subjectPlacements,
}) {
  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>Welcome, {studentName}!</h1>
      </header>

      <div className="student-card">
        <h2 className="student-card-title">Quick Stats</h2>
        <div className="quick-stats-row">
          <div className="quick-stat-card quick-stat-completed">
            <div className="quick-stat-label">Completed Labs</div>
            <div className="quick-stat-value">{completedCount}</div>
          </div>

          <div className="quick-stat-card quick-stat-pending">
            <div className="quick-stat-label">Pending Labs</div>
            <div className="quick-stat-value">{pendingCount}</div>
          </div>

          <div className="quick-stat-card" style={{ background: "#dbeafe" }}>
            <div className="quick-stat-label">Pending Requests</div>
            <div className="quick-stat-value">{pendingRequestCount}</div>
          </div>
        </div>
      </div>

      <div className="student-card">
        <h2 className="student-card-title">Current Lab Membership</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Current Lab</th>
              <th>Request Status</th>
            </tr>
          </thead>
          <tbody>
            {subjectPlacements.map((placement) => (
              <tr key={placement.enrollment.id}>
                <td>{placement.subject.name}</td>
                <td>{placement.currentLabGroup.code}</td>
                <td>
                  <span className={getStatusBadgeClass(placement.latestRequest?.status)}>
                    {formatStatusLabel(placement.latestRequest)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectLabs({ placement, subject }) {
  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>{subject.name} - Lab Assignments</h1>
      </header>

      <div className="student-card">
        <div className="placement-card-header">
          <div>
            <h2 className="student-card-title" style={{ marginBottom: "0.35rem" }}>
              Current Lab
            </h2>
            <div className="placement-meta">
              {placement.academicGroup.code} • {placement.offering.academicYear} • {placement.offering.semester}
            </div>
          </div>
          <span className="placement-chip">{placement.currentLabGroup.code}</span>
        </div>
      </div>

      <div className="lab-list">
        {subject.labs.map((lab) => (
          <article key={lab.id} className="lab-card">
            <h3 className="lab-title">{lab.title}</h3>
            {lab.description && <p className="lab-description">{lab.description}</p>}

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

function StudentRequestPage({ createLabChangeRequest, subjectPlacements }) {
  return (
    <div className="student-panel">
      <header className="student-header">
        <h1>Lab Change Requests</h1>
      </header>

      <div className="student-card">
        <div className="placement-card-header">
          <div>
            <h2 className="student-card-title" style={{ marginBottom: "0.35rem" }}>
              Request workflow
            </h2>
            <div className="placement-meta">
              System keeps current lab until teacher approves. One pending request allowed per subject
              enrollment.
            </div>
          </div>
        </div>

        <div className="request-list">
          {subjectPlacements.map((placement) => (
            <StudentRequestCard
              key={placement.enrollment.id}
              createLabChangeRequest={createLabChangeRequest}
              placement={placement}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentRequestCard({ createLabChangeRequest, placement }) {
  const [requestedLabGroupId, setRequestedLabGroupId] = useState(
    placement.labGroupOptions.find((item) => item.id !== placement.currentLabGroup.id)?.id ?? ""
  );

  const latestRequest = placement.latestRequest;
  const canSubmitRequest = latestRequest?.status !== "PENDING" && requestedLabGroupId !== "";

  const submitRequest = () => {
    const result = createLabChangeRequest({
      studentSubjectEnrollmentId: placement.enrollment.id,
      requestedLabGroupId,
    });

    if (!result.ok) {
      alert(result.message);
      return;
    }

    alert("Lab change request submitted.");
  };

  return (
    <article className="request-card">
      <div className="placement-card-header">
        <div>
          <h3 className="lab-title" style={{ marginBottom: "0.35rem" }}>
            {placement.subject.name}
          </h3>
          <div className="placement-meta">
            Current lab: {placement.currentLabGroup.code}
          </div>
        </div>
        <span className={getStatusBadgeClass(latestRequest?.status)}>
          {formatStatusLabel(latestRequest)}
        </span>
      </div>

      <div className="request-form-row">
        <select
          className="form-input compact-input"
          disabled={latestRequest?.status === "PENDING"}
          value={requestedLabGroupId}
          onChange={(event) => setRequestedLabGroupId(event.target.value)}
        >
          <option value="">Select requested lab</option>
          {placement.labGroupOptions
            .filter((item) => item.id !== placement.currentLabGroup.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.code}
              </option>
            ))}
        </select>

        <button
          className="primary-button"
          disabled={!canSubmitRequest}
          onClick={submitRequest}
        >
          Request Change
        </button>
      </div>
    </article>
  );
}

function StudentProgressOverview({ subjects, progressMatrix }) {
  const labIds = ["lab1", "lab2", "lab3"];

  const getLabDifficulty = (subjectId, labId) => {
    const subjectLabs = labs[subjectId]?.TT319 || [];
    const lab = subjectLabs.find((item) => item.id === labId);
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

  const hasUngradedLab = (subjectProgress) =>
    labIds.some((labId) => {
      const grade = subjectProgress[labId]?.grade;
      return grade === "empty" || grade === undefined;
    });

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
                    Diff: {getLabDifficulty(subjects[0].id, labId)}
                  </div>
                </th>
              ))}

              <th>Absences</th>
              <th>Midterm</th>
              <th>Final (0-16)</th>
            </tr>
          </thead>

          <tbody>
            {subjects.map((subject) => {
              const subjectProgress = progressMatrix[subject.id] || {};
              const absences = getAbsences(subjectProgress);
              const notAllowed = absences >= 3;
              const final16 = calculateFinal16(subject.id, subjectProgress);

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
                          <div className="status-box status-empty">
                            {typeof entry.grade === "number" ? entry.grade : 0}
                          </div>

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
                    {notAllowed ? "Not allowed" : final16 === "" ? "—" : final16}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="legend">
        Grade: 0..Difficulty | Ն = Present | Բ = Absent | 3+ absences -&gt; Not allowed
      </p>
    </div>
  );
}
