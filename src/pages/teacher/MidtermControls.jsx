export default function MidtermControls({ midterms, activeMidterm, onSelect, onLock, error }) {
  const current = midterms.find((row) => row.midtermNo === activeMidterm);
  const firstLocked = midterms[0]?.status === 'LOCKED';
  const canLock = current?.status === 'OPEN' && current.assignedPoints === 16 &&
    (activeMidterm === 1 || firstLocked);
  return <div className="placement-card-header" style={{ marginBottom: '1rem' }}>
    <div>
      <div className="placement-meta">
        Midterm {activeMidterm} lab points assigned: {current?.assignedPoints ?? 0}/16
        {error && ` · ${error}`}
      </div>
      <button type="button" className="table-btn edit" onClick={() => onSelect(1)}>
        First midterm ({midterms[0]?.status?.toLowerCase() || 'open'})
      </button>{' '}
      <button type="button" className="table-btn edit" disabled={!firstLocked} onClick={() => onSelect(2)}>
        Second midterm ({midterms[1]?.status?.toLowerCase() || 'open'})
      </button>
    </div>
    {current?.status === 'OPEN' && <button type="button" className="primary-button"
      disabled={!canLock} onClick={onLock}>
      {activeMidterm === 1 ? 'Lock first midterm and start second' : 'Lock second midterm'}
    </button>}
  </div>;
}
