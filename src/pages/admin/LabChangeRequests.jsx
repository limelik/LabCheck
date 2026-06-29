import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

function formatTimestamp(value) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusBadgeClass(status) {
  if (status === "APPROVED") return "status-badge status-badge-approved";
  if (status === "REJECTED") return "status-badge status-badge-rejected";
  return "status-badge status-badge-pending";
}

export default function LabChangeRequests() {
  const [filter, setFilter] = useState("ALL");
  const {
    getEnrichedEnrollmentById,
    labChangeRequests,
    teachersById,
  } = useLabChange();

  const requestRows = useMemo(
    () =>
      labChangeRequests
        .map((request) => ({
          request,
          enrollmentRow: getEnrichedEnrollmentById(request.studentSubjectEnrollmentId),
        }))
        .filter((row) => row.enrollmentRow !== null)
        .sort(
          (left, right) =>
            new Date(right.request.requestedAt).getTime() -
            new Date(left.request.requestedAt).getTime()
        ),
    [getEnrichedEnrollmentById, labChangeRequests]
  );

  const filteredRows = requestRows.filter(({ request }) =>
    filter === "ALL" ? true : request.status === filter
  );

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Lab Change Requests</h1>

        <div className="filter-row" style={{ marginBottom: "1rem" }}>
          {FILTERS.map((option) => (
            <button
              key={option}
              className={
                "subject-pill filter-pill" + (filter === option ? " subject-pill-active" : "")
              }
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject Offering</th>
                <th>Current Lab Group</th>
                <th>Requested Lab Group</th>
                <th>Status</th>
                <th>Requested Time</th>
                <th>Teacher</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No requests for this filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ request, enrollmentRow }) => (
                  <tr key={request.id}>
                    <td>{enrollmentRow.studentName}</td>
                    <td>
                      {enrollmentRow.subject.name} ({enrollmentRow.academicGroup.code})
                    </td>
                    <td>{request.currentLabGroupId}</td>
                    <td>{request.requestedLabGroupId}</td>
                    <td>
                      <span className={getStatusBadgeClass(request.status)}>{request.status}</span>
                    </td>
                    <td>{formatTimestamp(request.requestedAt)}</td>
                    <td>
                      {request.decidedByTeacherId
                        ? `${teachersById[request.decidedByTeacherId].firstName} ${teachersById[request.decidedByTeacherId].lastName}`
                        : "Awaiting teacher"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
