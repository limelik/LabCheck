import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../../layout/DashboardLayout.jsx";
import { progressMatrix, subjects } from "../../data/studentData.js";
import { labs } from "../../data/labData.js";
import { teacherProgressData } from "../../data/teacherProgressData.js";
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
            <StudentProgressOverview progressMatrix={progressMatrix} placements={subjectPlacements} />
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
  const { isFirstMidtermLocked } = useLabChange();
  const subjectLabs = labs[subject.id]?.[placement.academicGroup.id] ?? subject.labs;
  const visibleLabs = isFirstMidtermLocked(subject.id, placement.academicGroup.id)
    ? subjectLabs
    : subjectLabs.filter((lab) => (lab.midtermNo ?? 1) === 1);
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
        {visibleLabs.map((lab) => (
          <article key={lab.id} className="lab-card">
            <h3 className="lab-title">Midterm {lab.midtermNo ?? 1} · {lab.title}</h3>
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

function StudentProgressOverview({ placements, progressMatrix }) {
  const { isFirstMidtermLocked } = useLabChange();

  return (
    <div className="student-panel">
      <header className="student-header"><h1>Progress Overview</h1></header>
      {placements.map((placement) => {
        const subjectId = placement.subject.id;
        const groupId = placement.academicGroup.id;
        const subjectLabs = labs[subjectId]?.[groupId] ?? [];
        const midtermNumbers = isFirstMidtermLocked(subjectId, groupId) ? [1, 2] : [1];
        const teacherRow = Object.values(teacherProgressData[subjectId]?.[groupId] ?? {})
          .flatMap((section) => section.students)
          .find((row) => row.id === placement.student.id);

        return midtermNumbers.map((midtermNo) => {
          const midtermLabs = subjectLabs.filter((lab) => (lab.midtermNo ?? 1) === midtermNo);
          const subjectProgress = teacherRow?.labs ?? (midtermNo === 1 ? progressMatrix[subjectId] ?? {} : {});
          const absences = midtermLabs.filter(
            (lab) => subjectProgress[lab.id]?.attendance === "absent"
          ).length;
          const notAllowed = absences >= 3;
          const allGraded = midtermLabs.length > 0 && midtermLabs.every(
            (lab) => Number.isInteger(subjectProgress[lab.id]?.grade)
          );
          const score = allGraded
            ? midtermLabs.reduce((sum, lab) => sum + subjectProgress[lab.id].grade, 0)
            : null;
          const examScore = teacherRow?.examScores?.[midtermNo] ?? null;
          const overallScore = score === null || examScore === null
            ? null
            : score + examScore;

          return (
            <div className="student-card" key={`${placement.enrollment.id}-${midtermNo}`}>
              <h2>{placement.subject.name} — midterm {midtermNo}{midtermNo === 1 && midtermNumbers.length === 2 ? " (locked)" : ""}</h2>
              {midtermLabs.length === 0 ? <p>No labs yet.</p> : (
                <table className="progress-table">
                  <thead><tr><th>Lab</th><th>Max points</th><th>Grade</th><th>Attendance</th></tr></thead>
                  <tbody>
                    {midtermLabs.map((lab) => {
                      const result = subjectProgress[lab.id] ?? {};
                      return (
                        <tr key={lab.id}>
                          <td>{lab.title}</td>
                          <td>{lab.difficulty}</td>
                          <td>{Number.isInteger(result.grade) ? result.grade : "—"}</td>
                          <td>{result.attendance ?? "Unmarked"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <p>
                Absences: {absences} · Eligibility: {notAllowed ? "Not allowed" : "Allowed"}
                {" · "}Lab points: {score ?? "—"} / 16
                {" · "}Exam: {examScore ?? "—"} / 4
                {" · "}Overall: {notAllowed ? "Not allowed" : overallScore ?? "—"} / 20
              </p>
            </div>
          );
        });
      })}
      <p className="legend">Whole-number grades · 3+ absences: Not allowed · Each midterm has 16 lab points and a 4-point exam</p>
    </div>
  );
}
