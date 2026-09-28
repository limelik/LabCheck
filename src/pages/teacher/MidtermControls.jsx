import { useLabChange } from "../../context/LabChangeContext.jsx";
import { getMidtermLabPoints, labs, MIDTERM_LAB_POINTS } from "../../data/labData.js";

export default function MidtermControls({ subjectId, groupId }) {
  const {
    getActiveMidterm,
    getMidtermLockReadiness,
    isFirstMidtermLocked,
    isSecondMidtermLocked,
    lockFirstMidterm,
    lockSecondMidterm,
    selectMidterm,
  } = useLabChange();
  const active = getActiveMidterm(subjectId, groupId);
  const locked = isFirstMidtermLocked(subjectId, groupId);
  const secondLocked = isSecondMidtermLocked(subjectId, groupId);
  const assignedPoints = getMidtermLabPoints(labs[subjectId]?.[groupId] ?? [], active);
  const readiness = getMidtermLockReadiness(subjectId, groupId, active);
  const lock = () => {
    const result = active === 1
      ? lockFirstMidterm(subjectId, groupId)
      : lockSecondMidterm(subjectId, groupId);
    if (!result.ok) alert(result.message);
  };

  return (
    <div className="placement-card-header" style={{ marginBottom: "1rem" }}>
      <div>
        <div className="placement-meta">
          Midterm {active} lab points assigned: {assignedPoints}/{MIDTERM_LAB_POINTS}
          {!readiness.ok && ` · ${readiness.message}`}
        </div>
        <button type="button" className="table-btn edit" onClick={() => selectMidterm(subjectId, groupId, 1)}>
          First midterm {locked ? "(locked)" : "(open)"}
        </button>{" "}
        <button type="button" className="table-btn edit" disabled={!locked}
          onClick={() => selectMidterm(subjectId, groupId, 2)}>
          Second midterm {secondLocked ? "(locked)" : active === 2 ? "(active)" : ""}
        </button>
      </div>
      {!locked && (
        <button type="button" className="primary-button"
          disabled={!readiness.ok}
          onClick={lock}>
          Lock first midterm and start second
        </button>
      )}
      {locked && active === 2 && !secondLocked && (
        <button type="button" className="primary-button"
          disabled={!readiness.ok}
          onClick={lock}>
          Lock second midterm
        </button>
      )}
    </div>
  );
}
