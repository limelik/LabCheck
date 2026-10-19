import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { api } from '../../api/client.js';
import MidtermControls from './MidtermControls.jsx';
import './TeacherProgressTable.css';

const nextAttendance = { UNMARKED: 'PRESENT', PRESENT: 'ABSENT', ABSENT: 'EXCUSED', EXCUSED: 'UNMARKED' };
const attendanceSymbol = { PRESENT: 'Ն', ABSENT: 'Բ', EXCUSED: 'Հ', UNMARKED: '' };

export default function TeacherProgressTable({ offeringId, subgroupId }) {
  const [midterms, setMidterms] = useState([]);
  const [activeMidterm, setActiveMidterm] = useState(1);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const [termRows, studentRows] = await Promise.all([
      api(`/offerings/${offeringId}/midterms`),
      api(`/offerings/${offeringId}/midterms/${activeMidterm}/progress?labGroupId=${subgroupId}`),
    ]);
    setMidterms(termRows); setStudents(studentRows);
  }, [offeringId, activeMidterm, subgroupId]);
  useEffect(() => {
    let active = true;
    Promise.all([
      api(`/offerings/${offeringId}/midterms`),
      api(`/offerings/${offeringId}/midterms/${activeMidterm}/progress?labGroupId=${subgroupId}`),
    ]).then(([terms, rows]) => { if (active) { setMidterms(terms); setStudents(rows); } })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [offeringId, activeMidterm, subgroupId]);
  const current = midterms.find((row) => row.midtermNo === activeMidterm);
  const labs = current?.labs || [];
  const readOnly = current?.status === 'LOCKED';

  const saveResult = async (student, lab, changes) => {
    const old = student.labResults.find((row) => row.labId === lab.id) || { grade: null, attendance: 'UNMARKED' };
    try {
      await api(`/labs/${lab.id}/results/${student.enrollmentId}`, { method: 'PUT',
        body: { grade: changes.grade === undefined ? old.grade : changes.grade,
          attendance: changes.attendance || old.attendance } });
      setError(''); await refresh();
    } catch (err) { setError(err.message); }
  };
  const saveExam = async (student, examScore) => {
    try {
      await api(`/offerings/${offeringId}/midterms/${activeMidterm}/exam-results/${student.enrollmentId}`,
        { method: 'PUT', body: { examScore } });
      setError(''); await refresh();
    } catch (err) { setError(err.message); }
  };
  const lock = async () => {
    try {
      await api(`/offerings/${offeringId}/midterms/${activeMidterm}/lock`, { method: 'POST' });
      setError('');
      if (activeMidterm === 1) setActiveMidterm(2);
      else await refresh();
    } catch (err) { setError(err.message); }
  };
  const exportNotAllowed = () => {
    const rows = students.filter((row) => row.eligibility === 'NOT_ALLOWED').map((row) => ({
      Name: `${row.firstName} ${row.lastName}`, Absences: row.absences, Midterm: 'Not allowed',
    }));
    if (!rows.length) { alert('No students Not allowed.'); return; }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'NotAllowed');
    saveAs(new Blob([XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })]),
      `${offeringId}_${subgroupId}_NotAllowed.xlsx`);
  };
  return <div>
    <MidtermControls midterms={midterms} activeMidterm={activeMidterm}
      onSelect={setActiveMidterm} onLock={lock} error={error} />
    <h2>Progress Overview — offering {offeringId} / lab group {subgroupId} — midterm {activeMidterm}</h2>
    {!labs.length || !students.length ? <p className="placeholder">No progress data available for this midterm.</p> :
      <table className="progress-table"><thead><tr>
        <th>Student Name</th>
        {labs.map((lab) => <th key={lab.id}>Lab {lab.labNumber}<div style={{ fontSize: 12, opacity: 0.7 }}>Diff: {lab.difficulty}</div></th>)}
        <th>Absences</th><th>Midterm</th><th>Lab points (0–16)</th><th>Exam (0–4)</th><th>Overall (0–20)</th>
      </tr></thead><tbody>
        {students.map((student) => <tr key={student.enrollmentId}>
          <td>{student.firstName} {student.lastName}</td>
          {labs.map((lab) => {
            const result = student.labResults.find((row) => row.labId === lab.id) || { grade: null, attendance: 'UNMARKED' };
            return <td key={lab.id}><div className="status-cell">
              <select className="grade-select" value={result.grade ?? ''} disabled={readOnly}
                onChange={(event) => saveResult(student, lab, { grade: event.target.value === '' ? null : Number(event.target.value) })}>
                <option value="">—</option>
                {Array.from({ length: lab.difficulty + 1 }, (_, grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
              <button className={`status-box attendance-${result.attendance.toLowerCase()}`}
                type="button" disabled={readOnly}
                title={`Attendance: ${result.attendance}. Click to cycle.`}
                onClick={() => saveResult(student, lab, { attendance: nextAttendance[result.attendance] })}>
                {attendanceSymbol[result.attendance]}
              </button>
            </div></td>;
          })}
          <td style={{ textAlign: 'center' }}>{student.absences}</td>
          <td style={{ textAlign: 'center', fontWeight: 700 }}>{student.eligibility === 'NOT_ALLOWED' ? 'Not allowed' : 'Allowed'}</td>
          <td style={{ textAlign: 'center' }}>{student.labPoints ?? '—'}</td>
          <td style={{ textAlign: 'center' }}><select className="grade-select" value={student.examScore ?? ''}
            disabled={readOnly} onChange={(event) => saveExam(student, event.target.value === '' ? null : Number(event.target.value))}>
            <option value="">—</option>{[0, 1, 2, 3, 4].map((score) => <option key={score} value={score}>{score}</option>)}
          </select></td>
          <td style={{ textAlign: 'center' }}>{student.eligibility === 'NOT_ALLOWED' ? 'Not allowed' : student.overallPoints ?? '—'}</td>
        </tr>)}
      </tbody></table>}
    <div className="legend">Grade: 0..Difficulty · Ն = Present · Բ = Absent · Հ = Excused · 3+ absences → Not allowed</div>
    <button className="export-btn" onClick={exportNotAllowed}>⬇ Export Not allowed</button>
  </div>;
}
