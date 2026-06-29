export default function StudentStatusCell({ status, attendance }) {
  const statusSymbol =
    status === "completed" ? "✔" : status === "pending" ? "✖" : "";
  const statusClass =
    status === "completed"
      ? "status-box status-completed"
      : status === "pending"
      ? "status-box status-pending"
      : "status-box status-empty";

  const attendanceSymbol =
    attendance === "present" ? "Ն" : attendance === "absent" ? "Բ" : "";
  const attendanceClass =
    attendance === "present"
      ? "status-box attendance-present"
      : attendance === "absent"
      ? "status-box attendance-absent"
      : "status-box status-empty";

  return (
    <div className="status-cell">
      <div className={statusClass}>{statusSymbol}</div>
      <div className={attendanceClass}>{attendanceSymbol}</div>
    </div>
  );
}
