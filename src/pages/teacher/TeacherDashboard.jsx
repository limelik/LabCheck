import { useMemo, useState } from "react";
import DashboardLayout from "../../layout/DashboardLayout.jsx";
import TeacherSidebar from "./TeacherSidebar.jsx";
import TeacherLabManager from "./TeacherLabManager.jsx";
import TeacherProgressTable from "./TeacherProgressTable.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

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

export default function TeacherDashboard() {
  const {
    approveLabChangeRequest,
    currentTeacher,
    getEnrichedEnrollmentById,
    labChangeRequests,
    rejectLabChangeRequest,
    teacherAssignments,
  } = useLabChange();

  const [selectedOffering, setSelectedOffering] = useState(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);
  const [view, setView] = useState("labs");

  const teacherOfferingIds = useMemo(
    () =>
      new Set(
        teacherAssignments
          .filter((assignment) => assignment.teacherId === currentTeacher.id)
          .map((assignment) => assignment.subjectOfferingId)
      ),
    [currentTeacher.id, teacherAssignments]
  );

  const requestRows = useMemo(
    () =>
      labChangeRequests
        .map((request) => ({
          request,
          enrollmentRow: getEnrichedEnrollmentById(request.studentSubjectEnrollmentId),
        }))
        .filter(
          (row) =>
            row.enrollmentRow !== null &&
            teacherOfferingIds.has(row.enrollmentRow.offering.id)
        )
        .sort(
          (left, right) =>
            new Date(right.request.requestedAt).getTime() -
            new Date(left.request.requestedAt).getTime()
        ),
    [getEnrichedEnrollmentById, labChangeRequests, teacherOfferingIds]
  );

  const pendingRows = requestRows.filter((row) => row.request.status === "PENDING");
  const recentDecisionRows = requestRows.filter((row) => row.request.status !== "PENDING");

  const approveRequest = async (requestId) => {
    try { await approveLabChangeRequest(requestId); }
    catch (error) { alert(error.message); }
  };

  const rejectRequest = async (requestId) => {
    try { await rejectLabChangeRequest(requestId); }
    catch (error) { alert(error.message); }
  };

  return (
    <DashboardLayout>
      <div className="teacher-layout">
        <TeacherSidebar
          pendingRequestCount={pendingRows.length}
          selectedOffering={selectedOffering}
          selectedSubgroup={selectedSubgroup}
          setSelectedOffering={setSelectedOffering}
          setSelectedSubgroup={setSelectedSubgroup}
          setView={setView}
          view={view}
        />

        <div className="teacher-main">
          {view === "requests" && (
            <TeacherRequestQueue
              approveRequest={approveRequest}
              pendingRows={pendingRows}
              recentDecisionRows={recentDecisionRows}
              rejectRequest={rejectRequest}
            />
          )}

          {view !== "requests" && !selectedOffering && (
            <p className="placeholder">Select an offering or open request queue.</p>
          )}

          {view !== "requests" && selectedOffering && !selectedSubgroup && (
            <>
              <TeacherLabManager key={selectedOffering} offeringId={selectedOffering} />
              <p className="placeholder" style={{ marginTop: "1rem" }}>
                Select a subgroup on left to open Progress Overview.
              </p>
            </>
          )}

          {view !== "requests" &&
            selectedOffering &&
            selectedSubgroup &&
            view === "labs" && (
              <TeacherLabManager key={selectedOffering} offeringId={selectedOffering} />
            )}

          {view !== "requests" &&
            selectedOffering &&
            selectedSubgroup &&
            view === "progress" && (
              <TeacherProgressTable
                key={`${selectedOffering}-${selectedSubgroup}`}
                offeringId={selectedOffering}
                subgroupId={selectedSubgroup}
              />
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function TeacherRequestQueue({
  approveRequest,
  pendingRows,
  recentDecisionRows,
  rejectRequest,
}) {
  const labCode = (row, id) => row.labGroupOptions.find((group) => group.id === id)?.code || id;
  return (
    <div>
      <div className="student-card">
        <div className="placement-card-header">
          <div>
            <h2 className="student-card-title" style={{ marginBottom: "0.35rem" }}>
              Pending Lab Change Requests
            </h2>
            <div className="placement-meta">
              Approval moves the student to the requested lab. Rejection keeps the current placement.
            </div>
          </div>
          <span className="placement-chip">{pendingRows.length} pending</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Offering</th>
              <th>Current Lab</th>
              <th>Requested Lab</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRows.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No pending requests in your offerings.
                </td>
              </tr>
            ) : (
              pendingRows.map(({ enrollmentRow, request }) => (
                <tr key={request.id}>
                  <td>{enrollmentRow.studentName}</td>
                  <td>
                    {enrollmentRow.subject.name} ({enrollmentRow.academicGroup.code})
                    <div className="placement-meta">{enrollmentRow.offering.academicYear} · {enrollmentRow.offering.semester}</div>
                  </td>
                  <td>{labCode(enrollmentRow, request.currentLabGroupId)}</td>
                  <td>{labCode(enrollmentRow, request.requestedLabGroupId)}</td>
                  <td>{formatTimestamp(request.requestedAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="table-btn edit" onClick={() => approveRequest(request.id)}>
                        Approve
                      </button>
                      <button
                        className="table-btn delete"
                        onClick={() => rejectRequest(request.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="student-card" style={{ marginTop: "1.5rem" }}>
        <div className="placement-card-header">
          <h2 className="student-card-title" style={{ marginBottom: 0 }}>
            Recent Decisions
          </h2>
          <span className="placement-chip">{recentDecisionRows.length} decided</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Offering</th>
              <th>Status</th>
              <th>Requested Lab</th>
              <th>Decided At</th>
            </tr>
          </thead>
          <tbody>
            {recentDecisionRows.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  No decisions yet.
                </td>
              </tr>
            ) : (
              recentDecisionRows.map(({ enrollmentRow, request }) => (
                <tr key={request.id}>
                  <td>{enrollmentRow.studentName}</td>
                  <td>
                    {enrollmentRow.subject.name} ({enrollmentRow.academicGroup.code})
                    <div className="placement-meta">{enrollmentRow.offering.academicYear} · {enrollmentRow.offering.semester}</div>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(request.status)}>{request.status}</span>
                  </td>
                  <td>{labCode(enrollmentRow, request.requestedLabGroupId)}</td>
                  <td>{request.decidedAt ? formatTimestamp(request.decidedAt) : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
