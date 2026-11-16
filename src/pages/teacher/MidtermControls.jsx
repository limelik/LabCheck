import { useLabChange } from "../../context/LabChangeContext.jsx";
import { getMidtermLabPoints, MIDTERM_LAB_POINTS } from "../../data/labData.js";

export default function MidtermControls({ offeringId }) {
  const {
    getActiveMidtermForOffering,
    getMidtermLockReadinessForOffering,
    isFirstMidtermLockedForOffering,
    isSecondMidtermLockedForOffering,
    lockFirstMidtermForOffering,
    lockSecondMidtermForOffering,
    selectMidtermForOffering,
    labsByOffering,
  } = useLabChange();
  const active = getActiveMidtermForOffering(offeringId);
  const locked = isFirstMidtermLockedForOffering(offeringId);
  const secondLocked = isSecondMidtermLockedForOffering(offeringId);
  const assignedPoints = getMidtermLabPoints(labsByOffering[offeringId] ?? [], active);
  const readiness = getMidtermLockReadinessForOffering(offeringId, active);
  const lock = async () => {
    const result = await (active === 1
      ? lockFirstMidtermForOffering(offeringId)
      : lockSecondMidtermForOffering(offeringId));
    if (!result.ok) alert(result.message);
  };

  return (
    <div className="placement-card-header" style={{ marginBottom: "1rem" }}>
      <div>
        <div className="placement-meta">
          Midterm {active} lab points assigned: {assignedPoints}/{MIDTERM_LAB_POINTS}
          {!readiness.ok && ` · ${readiness.message}`}
        </div>
        <button type="button" className="table-btn edit" onClick={() => selectMidtermForOffering(offeringId, 1)}>
          First midterm {locked ? "(locked)" : "(open)"}
        </button>{" "}
        <button type="button" className="table-btn edit" disabled={!locked}
          onClick={() => selectMidtermForOffering(offeringId, 2)}>
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
