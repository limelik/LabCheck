export default function MidtermControls({
  midterms,
  activeMidterm,
  onSelect,
  onLock,
  error,
  busy = false,
  groupMode = false,
}) {
  const current = midterms.find((row) => row.midtermNo === activeMidterm);
  const firstLocked = midterms[0]?.secondStarted;
  const canLock = groupMode
    ? current?.canLock || current?.canUnlock
    : midterms[0]?.canStartSecond;
  return (
    <div className="placement-card-header" style={{ marginBottom: "1rem" }}>
      <div>
        <button
          type="button"
          className="table-btn edit"
          disabled={busy}
          onClick={() => onSelect(1)}
        >
          First midterm (
          {midterms[0]?.status?.toLowerCase().replaceAll("_", " ") || "open"})
        </button>{" "}
        <button
          type="button"
          className="table-btn edit"
          disabled={busy || !firstLocked}
          onClick={() => onSelect(2)}
        >
          Second midterm (
          {midterms[1]?.status?.toLowerCase().replaceAll("_", " ") || "open"})
        </button>
        {groupMode &&
          current?.status === "OPEN" &&
          current.lockIssues?.length > 0 && (
            <details className="midterm-blocker">
              <summary>Complete results before locking</summary>
              <ul>
                {current.lockIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </details>
          )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {(groupMode || !firstLocked) && (
        <button
          type="button"
          className="primary-button"
          disabled={busy || !canLock}
          title={
            !groupMode && !canLock
              ? "Lock the first midterm in each lab group assigned to you for this subject."
              : undefined
          }
          onClick={onLock}
        >
          {groupMode
            ? `${current?.status === "LOCKED" ? "Unlock" : "Lock"} ${activeMidterm === 1 ? "first" : "second"} midterm`
            : "Start Second Midterm"}
        </button>
      )}
    </div>
  );
}
