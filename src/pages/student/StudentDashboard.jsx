import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layout/DashboardLayout.jsx';
import { api } from '../../api/client.js';
import { useLabChange } from '../../context/LabChangeContext.jsx';

const VIEWS = { OVERVIEW: 'overview', PROGRESS: 'progress', REQUESTS: 'requests', LABS: 'labs' };
const badge = (status) => status === 'APPROVED' ? 'status-badge status-badge-approved'
  : status === 'REJECTED' ? 'status-badge status-badge-rejected'
    : status === 'PENDING' ? 'status-badge status-badge-pending' : 'status-badge status-badge-neutral';

export default function StudentDashboard() {
  const { currentStudent, enrollments, getEnrichedEnrollment, createLabChangeRequest } = useLabChange();
  const [view, setView] = useState(VIEWS.OVERVIEW);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/students/me/progress').then(setProgress).catch((err) => setError(err.message));
  }, [enrollments]);
  const placements = useMemo(() => enrollments.map(getEnrichedEnrollment).filter(Boolean)
    .sort((a, b) => a.subject.name.localeCompare(b.subject.name)), [enrollments, getEnrichedEnrollment]);
  const selected = placements.find((item) => item.enrollment.id === selectedEnrollmentId);
  const visibleProgress = (enrollmentId) => {
    const rows = progress.filter((row) => row.enrollmentId === enrollmentId);
    return rows.filter((row) => row.midtermNo === 1 || rows.find((first) => first.midtermNo === 1)?.status === 'LOCKED');
  };
  const labRows = progress.flatMap((row) => row.labs);
  const completedCount = labRows.filter((lab) => lab.grade !== null).length;
  const pendingCount = labRows.filter((lab) => lab.grade === null).length;
  const pendingRequestCount = placements.filter((item) => item.latestRequest?.status === 'PENDING').length;
  return <DashboardLayout><div className="student-layout">
    <aside className="student-sidebar">
      <h3 className="sidebar-section-title">My Subjects</h3>
      <div className="student-subject-list">{placements.map((placement) => <button
        key={placement.enrollment.id}
        className={'subject-pill' + (selectedEnrollmentId === placement.enrollment.id ? ' subject-pill-active' : '')}
        onClick={() => { setSelectedEnrollmentId(placement.enrollment.id); setView(VIEWS.LABS); }}>
        {placement.subject.name} · {placement.offering.academicYear} {placement.offering.semester}
      </button>)}</div>
      <div className="student-sidebar-divider" />
      <button className={'subject-pill' + (view === VIEWS.PROGRESS ? ' subject-pill-active' : '')}
        onClick={() => setView(VIEWS.PROGRESS)}>Progress Overview</button>
      <button className={'subject-pill' + (view === VIEWS.REQUESTS ? ' subject-pill-active' : '')}
        style={{ marginTop: '0.5rem' }} onClick={() => setView(VIEWS.REQUESTS)}>Lab Change Requests</button>
    </aside>
    <section className="student-main">
      {error && <p className="auth-error">{error}</p>}
      {view === VIEWS.OVERVIEW && <div className="student-panel">
        <header className="student-header"><h1>Welcome, {currentStudent.firstName} {currentStudent.lastName}!</h1></header>
        <div className="student-card"><h2 className="student-card-title">Quick Stats</h2>
          <div className="quick-stats-row">
            <div className="quick-stat-card quick-stat-completed"><div className="quick-stat-label">Completed Labs</div><div className="quick-stat-value">{completedCount}</div></div>
            <div className="quick-stat-card quick-stat-pending"><div className="quick-stat-label">Pending Labs</div><div className="quick-stat-value">{pendingCount}</div></div>
            <div className="quick-stat-card" style={{ background: '#dbeafe' }}><div className="quick-stat-label">Pending Requests</div><div className="quick-stat-value">{pendingRequestCount}</div></div>
          </div></div>
        <div className="student-card"><h2 className="student-card-title">Current Lab Membership</h2>
          <table className="admin-table"><thead><tr><th>Subject</th><th>Current Lab</th><th>Request Status</th></tr></thead>
            <tbody>{placements.map((item) => <tr key={item.enrollment.id}>
              <td>{item.subject.name} · {item.offering.academicYear} {item.offering.semester}</td>
              <td>{item.currentLabGroup?.code}</td>
              <td><span className={badge(item.latestRequest?.status)}>{item.latestRequest?.status || 'NO REQUEST'}</span></td>
            </tr>)}</tbody></table></div>
      </div>}
      {view === VIEWS.LABS && selected && <div className="student-panel">
        <header className="student-header"><h1>{selected.subject.name} - Lab Assignments</h1></header>
        <div className="student-card"><div className="placement-card-header"><div>
          <h2 className="student-card-title">Current Lab</h2>
          <div className="placement-meta">{selected.academicGroup.code} · {selected.offering.academicYear} · {selected.offering.semester}</div>
        </div><span className="placement-chip">{selected.currentLabGroup?.code}</span></div></div>
        <div className="lab-list">{visibleProgress(selected.enrollment.id).flatMap((row) => row.labs.map((lab) => <article className="lab-card" key={lab.labId}>
          <h3 className="lab-title">Midterm {row.midtermNo} · Lab {lab.labNumber}: {lab.title}</h3>
          {lab.description && <p className="lab-description">{lab.description}</p>}
        </article>))}</div>
      </div>}
      {view === VIEWS.REQUESTS && <div className="student-panel">
        <header className="student-header"><h1>Lab Change Requests</h1></header>
        <div className="student-card"><h2 className="student-card-title">Request workflow</h2>
          <p className="placement-meta">Your current lab changes only after teacher approval. One pending request is allowed per subject enrollment.</p>
          <div className="request-list">{placements.map((item) => <StudentRequestCard key={item.enrollment.id}
            placement={item} createLabChangeRequest={createLabChangeRequest} />)}</div>
        </div>
      </div>}
      {view === VIEWS.PROGRESS && <div className="student-panel">
        <header className="student-header"><h1>Progress Overview</h1></header>
        {placements.flatMap((item) => visibleProgress(item.enrollment.id).map((row) => <div className="student-card" key={`${item.enrollment.id}-${row.midtermNo}`}>
          <h2>{item.subject.name} — midterm {row.midtermNo}{row.status === 'LOCKED' ? ' (locked)' : ''}</h2>
          <p className="placement-meta">{item.offering.academicYear} · {item.offering.semester}</p>
          {!row.labs.length ? <p>No labs yet.</p> : <table className="progress-table"><thead><tr><th>Lab</th><th>Max points</th><th>Grade</th><th>Attendance</th></tr></thead>
            <tbody>{row.labs.map((lab) => <tr key={lab.labId}>
              <td>Lab {lab.labNumber}: {lab.title}</td><td>{lab.difficulty}</td>
              <td>{lab.grade ?? '—'}</td><td>{lab.attendance}</td>
            </tr>)}</tbody></table>}
          <p>Absences: {row.absences} · Eligibility: {row.eligibility === 'NOT_ALLOWED' ? 'Not allowed' : 'Allowed'}
            {' · '}Lab points: {row.labPoints ?? '—'} / 16
            {' · '}Exam: {row.examScore ?? '—'} / 4
            {' · '}Overall: {row.eligibility === 'NOT_ALLOWED' ? 'Not allowed' : row.overallPoints ?? '—'} / 20</p>
        </div>))}
        <p className="legend">Whole-number grades · 3+ absences: Not allowed · Each midterm has 16 lab points and a 4-point exam</p>
      </div>}
    </section>
  </div></DashboardLayout>;
}

function StudentRequestCard({ placement, createLabChangeRequest }) {
  const [requestedLabGroupId, setRequestedLabGroupId] = useState('');
  const [error, setError] = useState('');
  const options = placement.labGroupOptions.filter((item) => item.id !== placement.currentLabGroup?.id);
  const submit = async () => {
    try {
      await createLabChangeRequest({ studentSubjectEnrollmentId: placement.enrollment.id, requestedLabGroupId });
      setError(''); setRequestedLabGroupId('');
    } catch (err) { setError(err.message); }
  };
  return <article className="request-card">
    <div className="placement-card-header"><div><h3 className="lab-title">{placement.subject.name}</h3>
      <div className="placement-meta">{placement.offering.academicYear} · {placement.offering.semester}</div>
      <div className="placement-meta">Current lab: {placement.currentLabGroup?.code}</div></div>
      <span className={badge(placement.latestRequest?.status)}>{placement.latestRequest?.status || 'NO REQUEST'}</span>
    </div>
    <div className="request-form-row"><select className="form-input compact-input"
      disabled={placement.latestRequest?.status === 'PENDING'} value={requestedLabGroupId}
      onChange={(event) => setRequestedLabGroupId(event.target.value)}>
      <option value="">Select requested lab</option>
      {options.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
    </select><button className="primary-button" disabled={!requestedLabGroupId || placement.latestRequest?.status === 'PENDING'}
      onClick={submit}>Request Change</button></div>
    {error && <p className="auth-error">{error}</p>}
  </article>;
}
