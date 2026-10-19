import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import MidtermControls from './MidtermControls.jsx';
import './TeacherLabManager.css';

export default function TeacherLabManager({ offeringId }) {
  const [midterms, setMidterms] = useState([]);
  const [activeMidterm, setActiveMidterm] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', difficulty: 1 });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setMidterms(await api(`/offerings/${offeringId}/midterms`));
  }, [offeringId]);
  useEffect(() => {
    let active = true;
    api(`/offerings/${offeringId}/midterms`)
      .then((rows) => { if (active) setMidterms(rows); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [offeringId]);
  const current = midterms.find((row) => row.midtermNo === activeMidterm);
  const labs = current?.labs || [];
  const allLabs = midterms.flatMap((row) => row.labs);
  const readOnly = current?.status === 'LOCKED';
  const remaining = 16 - (current?.assignedPoints || 0);
  const nextNumber = Math.max(0, ...allLabs.map((lab) => lab.labNumber)) + 1;

  const save = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) await api(`/labs/${editing}`, { method: 'PATCH', body: form });
      else await api(`/offerings/${offeringId}/midterms/${activeMidterm}/labs`, { method: 'POST', body: form });
      setEditing(null); setIsCreateOpen(false); await refresh();
    } catch (err) { setError(err.message); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this lab and its saved results?')) return;
    setError('');
    try { await api(`/labs/${id}`, { method: 'DELETE' }); await refresh(); }
    catch (err) { setError(err.message); }
  };
  const lock = async () => {
    setError('');
    try {
      await api(`/offerings/${offeringId}/midterms/${activeMidterm}/lock`, { method: 'POST' });
      await refresh();
      if (activeMidterm === 1) setActiveMidterm(2);
    } catch (err) { setError(err.message); }
  };
  const startEdit = (lab) => {
    setEditing(lab.id);
    setForm({ title: lab.title, description: lab.description || '', difficulty: lab.difficulty });
    setIsCreateOpen(true); setError('');
  };
  const startCreate = () => {
    setEditing(null); setForm({ title: '', description: '', difficulty: Math.min(3, remaining) });
    setIsCreateOpen(true); setError('');
  };
  return <div className="lab-manager">
    <div className="lab-header">
      <h2>Labs for offering {offeringId} — midterm {activeMidterm}</h2>
      <button className="add-lab-btn" onClick={startCreate}
        disabled={readOnly || !current || allLabs.length >= 14 || remaining <= 0}>+ Add Lab</button>
    </div>
    <MidtermControls midterms={midterms} activeMidterm={activeMidterm}
      onSelect={setActiveMidterm} onLock={lock} error={error} />
    <div className="lab-list">
      {labs.map((lab) => <div className="lab-card" key={lab.id}>
        <div className="lab-info">
          <h3 className="lab-title">Lab {lab.labNumber}: {lab.title} <span style={{ opacity: 0.75 }}>(Difficulty: {lab.difficulty})</span></h3>
          <p className="lab-desc">{lab.description || 'No description.'}</p>
          <button type="button" className="upload-btn" disabled title="Attachments are deferred">Attachments deferred</button>
        </div>
        <div className="lab-actions">
          <button className="icon-btn" disabled={readOnly} onClick={() => startEdit(lab)} aria-label={`Edit lab ${lab.labNumber}`}>✏️</button>
          <button className="icon-btn delete" disabled={readOnly} onClick={() => remove(lab.id)} aria-label={`Delete lab ${lab.labNumber}`}>🗑️</button>
        </div>
      </div>)}
    </div>
    {isCreateOpen && <div className="lab-dialog-backdrop">
      <section className="lab-dialog" role="dialog" aria-modal="true" aria-labelledby="lab-heading">
        <div className="lab-dialog-heading"><div>
          <h2 id="lab-heading">{editing ? 'Edit Lab' : `Create Lab ${nextNumber}`}</h2>
          <p>Midterm {activeMidterm} · {remaining} points remaining</p>
        </div><button type="button" className="lab-dialog-close" onClick={() => setIsCreateOpen(false)}>×</button></div>
        <form onSubmit={save}>
          <label className="lab-field">Title<input className="lab-input" required maxLength="255" value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="lab-field">Description<textarea className="lab-textarea" value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="lab-field">Difficulty / maximum points
            <select className="lab-input" value={form.difficulty}
              onChange={(event) => setForm({ ...form, difficulty: Number(event.target.value) })}>
              {[1, 2, 3, 4, 5].map((point) => <option key={point} value={point}>{point}</option>)}
            </select></label>
          <p className="lab-file-note">File attachments will be available after the core backend is stable.</p>
          {error && <p className="lab-form-error" role="alert">{error}</p>}
          <div className="lab-dialog-actions">
            <button type="button" className="cancel-btn" onClick={() => setIsCreateOpen(false)}>Cancel</button>
            <button type="submit" className="save-btn">Save Lab</button>
          </div>
        </form>
      </section>
    </div>}
  </div>;
}
