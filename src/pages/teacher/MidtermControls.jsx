import { useRef, useState } from "react";
import "./MidtermControls.css";
import { useLabChange } from "../../context/LabChangeContext.jsx";
import { getMidtermLabPoints, MIDTERM_LAB_POINTS } from "../../data/labData.js";

export default function MidtermControls({ offeringId, onNavigateToMissing }) {
  const dialogRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    getActiveMidtermForOffering,
    getMidtermLockReadinessForOffering,
    isFirstMidtermLockedForOffering,
    isSecondMidtermLockedForOffering,
    lockFirstMidtermForOffering,
    lockSecondMidtermForOffering,
    selectMidtermForOffering,
    labsByOffering,
    labGroupsById,
  } = useLabChange();
  const active = getActiveMidtermForOffering(offeringId);
  const locked = isFirstMidtermLockedForOffering(offeringId);
  const secondLocked = isSecondMidtermLockedForOffering(offeringId);
  const assignedPoints = getMidtermLabPoints(labsByOffering[offeringId] ?? [], active);
  const readiness = getMidtermLockReadinessForOffering(offeringId, active);
  const openReview = () => {
    setError("");
    dialogRef.current.showModal();
  };
  const navigate = (target) => {
    dialogRef.current.close();
    onNavigateToMissing({ ...target, midtermNo: active });
  };
  const lock = async () => {
    if (busy || !readiness.ok) return;
    setBusy(true);
    setError("");
    try {
      const result = await (active === 1
        ? lockFirstMidtermForOffering(offeringId)
        : lockSecondMidtermForOffering(offeringId));
      if (result.ok) dialogRef.current.close();
      else setError(result.message);
    } catch {
      setError("Could not lock the midterm. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="placement-card-header" style={{ marginBottom: "1rem" }}>
      <div>
        <div className="placement-meta">
          Midterm {active} lab points assigned: {assignedPoints}/{MIDTERM_LAB_POINTS}
        </div>
        <button type="button" className="table-btn edit" onClick={() => selectMidtermForOffering(offeringId, 1)}>
          First midterm {locked ? "(locked)" : active === 1 ? "(active)" : ""}
        </button>{" "}
        <button type="button" className="table-btn edit" disabled={!locked}
          onClick={() => selectMidtermForOffering(offeringId, 2)}>
          Second midterm {secondLocked ? "(locked)" : active === 2 ? "(active)" : ""}
        </button>
      </div>
      {!locked && (
        <button type="button" className="primary-button"
          onClick={openReview}>
          Finish Midterm 1
        </button>
      )}
      {locked && active === 2 && !secondLocked && (
        <button type="button" className="primary-button"
          onClick={openReview}>
          Finish Midterm 2
        </button>
      )}
      <dialog ref={dialogRef} className="midterm-review" aria-labelledby="midterm-review-title"
        onCancel={(event) => { if (busy) event.preventDefault(); }}>
        <h2 id="midterm-review-title">Finish Midterm {active}</h2>
        <p>
          {active === 1
            ? "This will finish Midterm 1 for your assigned lab groups and open Midterm 2 for you."
            : "This will finish Midterm 2 for your assigned lab groups."}
          {" "}Your groups’ results will become read-only. Other teachers can continue grading their groups. Shared lab assignments will also become read-only to protect finalized results.
        </p>
        {!readiness.ok && <p>Complete the items below, then return to this button to review again.</p>}
        {!readiness.pointsReady && (
          <div className="midterm-review-item">
            <strong>Lab assignments: {assignedPoints}/{MIDTERM_LAB_POINTS} points</strong>
            <p>Lab points must total exactly {MIDTERM_LAB_POINTS}.</p>
            <button type="button" className="table-btn edit" onClick={() => navigate({ field: "labs" })}>
              Go to lab assignments
            </button>
          </div>
        )}
        {readiness.incompleteStudents?.map((student) => (
          <section className="midterm-review-item" key={student.enrollmentId}>
            <h3>{student.name} <span>· {labGroupsById[student.labGroupId]?.name ?? student.labGroupId}</span></h3>
            <ul>
              {student.issues.map((issue) => (
                <li key={`${issue.field}-${issue.labId ?? "exam"}`}>
                  <button type="button" className="midterm-issue-link" onClick={() => navigate({
                    enrollmentId: student.enrollmentId, labGroupId: student.labGroupId, ...issue,
                  })}>{issue.label} →</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {readiness.ok && <p>All required results in your assigned groups are complete. You can now finish this midterm.</p>}
        {error && <p role="alert" className="midterm-review-error">{error}</p>}
        <div className="midterm-review-actions">
          <button type="button" className="table-btn edit" disabled={busy} onClick={() => dialogRef.current.close()}>Close</button>
          <button type="button" className="primary-button" disabled={busy || !readiness.ok} onClick={lock}>
            {busy ? "Finishing…" : active === 1 ? "Finish Midterm 1" : "Finish Midterm 2"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
