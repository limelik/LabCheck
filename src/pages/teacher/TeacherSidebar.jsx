import { useMemo } from 'react';
import './TeacherSidebar.css';
import { useLabChange } from '../../context/LabChangeContext.jsx';

export default function TeacherSidebar({ pendingRequestCount, selectedOffering, selectedSubgroup,
  setSelectedOffering, setSelectedSubgroup, view, setView }) {
  const { teacherAssignments } = useLabChange();
  const offerings = useMemo(() => {
    const grouped = new Map();
    for (const assignment of teacherAssignments) {
      if (!grouped.has(assignment.offeringId)) grouped.set(assignment.offeringId, {
        id: assignment.offeringId,
        label: `${assignment.subjectName} — ${assignment.academicGroupCode} — ${assignment.academicYear} ${assignment.semester}`,
        labs: [],
      });
      grouped.get(assignment.offeringId).labs.push({ id: assignment.labGroupId, code: assignment.labGroupCode });
    }
    return [...grouped.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [teacherAssignments]);
  return <aside className="teacher-sidebar">
    <h3 className="sidebar-title">Subjects</h3>
    {offerings.map((offering) => <div key={offering.id}>
      <button className={'sidebar-pill ' + (selectedOffering === offering.id ? 'sidebar-pill-active' : '')}
        onClick={() => { setSelectedOffering(offering.id); setSelectedSubgroup(null); setView('labs'); }}>
        {offering.label}
      </button>
      {selectedOffering === offering.id && <div className="sidebar-nested">
        {offering.labs.map((lab) => <button key={lab.id}
          className={'sidebar-pill ' + (selectedSubgroup === lab.id ? 'sidebar-pill-active' : '')}
          onClick={() => { setSelectedSubgroup(lab.id); setView('labs'); }}>
          {lab.code}
        </button>)}
      </div>}
    </div>)}
    <div style={{ marginTop: '1.5rem' }}>
      <button className={'sidebar-pill progress-pill ' + (view === 'progress' ? 'sidebar-pill-active' : '')}
        disabled={!selectedOffering || !selectedSubgroup}
        onClick={() => setView('progress')}>Progress Overview</button>
    </div>
    <div style={{ marginTop: '0.75rem' }}>
      <button className={'sidebar-pill progress-pill ' + (view === 'requests' ? 'sidebar-pill-active' : '')}
        onClick={() => setView('requests')}>Lab Change Queue ({pendingRequestCount})</button>
    </div>
  </aside>;
}
