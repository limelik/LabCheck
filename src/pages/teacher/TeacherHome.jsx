import { useLabChange } from "../../context/LabChangeContext.jsx";
import "./TeacherHome.css";

export default function TeacherHome({ onOpenClass }) {
  const {
    currentTeacher, teacherAssignments, offeringsById, subjectsById,
    academicGroupsById, labGroupsById,
    isFirstMidtermLockedForOffering, isSecondMidtermLockedForOffering,
  } = useLabChange();
  const classesByOffering = new Map();
  teacherAssignments.filter((assignment) => assignment.teacherId === currentTeacher.id)
    .forEach((assignment) => {
      const offering = offeringsById[assignment.subjectOfferingId];
      if (!offering) return;
      if (!classesByOffering.has(offering.id)) {
        classesByOffering.set(offering.id, { offering, labGroupIds: new Set() });
      }
      classesByOffering.get(offering.id).labGroupIds.add(assignment.labGroupId);
    });
  const classes = [...classesByOffering.values()].sort((a, b) =>
    b.offering.academicYear.localeCompare(a.offering.academicYear) ||
    (subjectsById[a.offering.subjectId]?.name ?? "").localeCompare(subjectsById[b.offering.subjectId]?.name ?? "") ||
    String(a.offering.academicGroupId).localeCompare(String(b.offering.academicGroupId), undefined, { numeric: true })
  );

  return (
    <div className="teacher-home">
      <section className="student-welcome">
        <div className="student-welcome-copy">
          <p className="student-welcome-kicker">Teacher dashboard</p>
          <h1>Welcome, {currentTeacher.firstName} {currentTeacher.lastName}!</h1>
          <p className="student-welcome-description">Here’s an overview of your classes. Manage lab assignments or pick up where you left off with grading.</p>
          <div className="student-welcome-meta">
            <span>{classes.length} assigned {classes.length === 1 ? "class" : "classes"}</span>
          </div>
        </div>
        <div className="student-welcome-mark" aria-hidden="true">LC</div>
      </section>

      <section aria-labelledby="teacher-classes-title">
        <h2 id="teacher-classes-title" className="student-card-title">Your classes</h2>
        {classes.length === 0 ? (
          <div className="student-card">
            <p>Your assigned classes will appear here.</p>
          </div>
        ) : (
          <div className="teacher-class-grid">
            {classes.map(({ offering, labGroupIds }) => {
              const firstLocked = isFirstMidtermLockedForOffering(offering.id);
              const secondLocked = isSecondMidtermLockedForOffering(offering.id);
              const midtermNo = firstLocked ? 2 : 1;
              const group = academicGroupsById[offering.academicGroupId];
              return (
                <article className="teacher-class-card" key={offering.id}>
                  <div className="teacher-class-heading">
                    <span className="teacher-class-group">{group?.code ?? offering.academicGroupId}</span>
                    <span className="placement-chip">{secondLocked ? "Both midterms finished" : `Midterm ${midtermNo} · Active`}</span>
                  </div>
                  <h3>{subjectsById[offering.subjectId]?.name ?? "Subject"}</h3>
                  <p className="placement-meta">{offering.academicYear} · {offering.semester}</p>
                  <button type="button" className="primary-button teacher-class-assignments"
                    onClick={() => onOpenClass(offering, "labs", null, midtermNo)}>
                    Lab assignments
                  </button>
                  <div className="teacher-class-progress">
                    <p>Progress overview</p>
                    <div className="teacher-class-groups">
                      {[...labGroupIds].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map((labGroupId) => (
                        <button type="button" className="table-btn edit" key={labGroupId}
                          aria-label={`Progress overview for ${subjectsById[offering.subjectId]?.name}, ${labGroupsById[labGroupId]?.name ?? labGroupId}`}
                          onClick={() => onOpenClass(offering, "progress", labGroupId, midtermNo)}>
                          {labGroupsById[labGroupId]?.name ?? labGroupId} →
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
