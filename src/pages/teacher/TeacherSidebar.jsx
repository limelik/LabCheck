import { useMemo } from "react";
import "./TeacherSidebar.css";
import { useLabChange } from "../../context/LabChangeContext.jsx";

export default function TeacherSidebar({
  pendingRequestCount,
  selectedSubject,
  selectedGroup,
  selectedSubgroup,
  setSelectedSubject,
  setSelectedGroup,
  setSelectedSubgroup,
  view,
  setView,
}) {
  const {
    academicGroupsById,
    currentTeacher,
    labGroupsById,
    offeringsById,
    subjectsById,
    teacherAssignments,
  } = useLabChange();

  const canShowProgress =
    selectedSubject !== null &&
    selectedGroup !== null &&
    selectedSubgroup !== null;

  const subjectTree = useMemo(() => {
    const grouped = new Map();

    teacherAssignments
      .filter((assignment) => assignment.teacherId === currentTeacher.id)
      .forEach((assignment) => {
        const offering = offeringsById[assignment.subjectOfferingId];
        const subject = subjectsById[offering.subjectId];
        const academicGroup = academicGroupsById[offering.academicGroupId];

        if (!grouped.has(subject.id)) {
          grouped.set(subject.id, {
            id: subject.id,
            name: subject.name,
            groups: new Map(),
          });
        }

        const subjectEntry = grouped.get(subject.id);

        if (!subjectEntry.groups.has(academicGroup.id)) {
          subjectEntry.groups.set(academicGroup.id, {
            id: academicGroup.id,
            name: academicGroup.code,
            labGroupIds: [],
          });
        }

        const groupEntry = subjectEntry.groups.get(academicGroup.id);

        if (!groupEntry.labGroupIds.includes(assignment.labGroupId)) {
          groupEntry.labGroupIds.push(assignment.labGroupId);
        }
      });

    return [...grouped.values()]
      .map((subject) => ({
        ...subject,
        groups: [...subject.groups.values()].map((group) => ({
          ...group,
          labGroupIds: group.labGroupIds.sort((left, right) =>
            left.localeCompare(right, undefined, { numeric: true })
          ),
        })),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [academicGroupsById, currentTeacher.id, offeringsById, subjectsById, teacherAssignments]);

  return (
    <aside className="teacher-sidebar">
      <h3 className="sidebar-title">Subjects</h3>

      {subjectTree.map((subject) => {
        const isSubjectActive = selectedSubject === subject.id;

        return (
          <div key={subject.id}>
            <button
              className={
                "sidebar-pill " + (isSubjectActive ? "sidebar-pill-active" : "")
              }
              onClick={() => {
                setSelectedSubject(subject.id);
                setSelectedGroup(null);
                setSelectedSubgroup(null);
                setView("labs");
              }}
            >
              {subject.name}
            </button>

            {isSubjectActive && (
              <div className="sidebar-nested">
                {subject.groups.map((group) => {
                  const isGroupActive = selectedGroup === group.id;

                  return (
                    <div key={group.id}>
                      <button
                        className={
                          "sidebar-pill " + (isGroupActive ? "sidebar-pill-active" : "")
                        }
                        style={{ paddingLeft: "1rem" }}
                        onClick={() => {
                          setSelectedGroup(group.id);
                          setSelectedSubgroup(null);
                          setView("labs");
                        }}
                      >
                        {group.name}
                      </button>

                      {isGroupActive && (
                        <div className="sidebar-nested deeper">
                          {group.labGroupIds.map((labGroupId) => {
                            const labGroup = labGroupsById[labGroupId];
                            const isSubActive = selectedSubgroup === labGroup.id;

                            return (
                              <button
                                key={labGroup.id}
                                className={
                                  "sidebar-pill " +
                                  (isSubActive ? "sidebar-pill-active" : "")
                                }
                                style={{ paddingLeft: "1.5rem" }}
                                onClick={() => {
                                  setSelectedSubgroup(labGroup.id);
                                  setView("labs");
                                }}
                              >
                                {labGroup.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: "1.5rem" }}>
        <button
          className={
            "sidebar-pill progress-pill " +
            (view === "progress" && canShowProgress ? "sidebar-pill-active" : "")
          }
          disabled={!canShowProgress}
          style={{
            opacity: canShowProgress ? 1 : 0.4,
            cursor: canShowProgress ? "pointer" : "not-allowed",
          }}
          onClick={() => {
            if (canShowProgress) {
              setView("progress");
            }
          }}
        >
          Progress Overview
        </button>
      </div>

      <div style={{ marginTop: "0.75rem" }}>
        <button
          className={
            "sidebar-pill progress-pill " + (view === "requests" ? "sidebar-pill-active" : "")
          }
          onClick={() => setView("requests")}
        >
          Lab Change Queue ({pendingRequestCount})
        </button>
      </div>
    </aside>
  );
}
