import "./TeacherSidebar.css";
import { teacher, subjects, groups, subgroups } from "../../data/teacherData";

export default function TeacherSidebar({
  selectedSubject,
  selectedGroup,
  selectedSubgroup,
  setSelectedSubject,
  setSelectedGroup,
  setSelectedSubgroup,
  view,
  setView,
}) {
  // You can click Progress Overview only after selecting subgroup
  const canShowProgress =
    selectedSubject !== null &&
    selectedGroup !== null &&
    selectedSubgroup !== null;

  return (
    <aside className="teacher-sidebar">
      <h3 className="sidebar-title">Subjects</h3>

      {teacher.subjects.map((subjId) => {
        const subj = subjects[subjId];
        const isSubjectActive = selectedSubject === subj.id;

        return (
          <div key={subj.id}>
            {/* SUBJECT */}
            <button
              className={
                "sidebar-pill " +
                (isSubjectActive ? "sidebar-pill-active" : "")
              }
              onClick={() => {
                setSelectedSubject(subj.id);
                setSelectedGroup(null);
                setSelectedSubgroup(null);
                setView("labs");
              }}
            >
              {subj.name}
            </button>

            {/* GROUPS (shown only after selecting subject) */}
            {isSubjectActive && (
              <div className="sidebar-nested">
                {subj.groups.map((groupId) => {
                  const g = groups[groupId];
                  const isGroupActive = selectedGroup === g.id;

                  return (
                    <div key={g.id}>
                      {/* GROUP */}
                      <button
                        className={
                          "sidebar-pill " +
                          (isGroupActive ? "sidebar-pill-active" : "")
                        }
                        style={{ paddingLeft: "1rem" }}
                        onClick={() => {
                          setSelectedGroup(g.id);
                          setSelectedSubgroup(null);
                          setView("labs");
                        }}
                      >
                        {g.name}
                      </button>

                      {/* SUBGROUPS (shown when a group is selected) */}
                      {isGroupActive && (
                        <div className="sidebar-nested deeper">
                          {g.subgroups.map((subId) => {
                            const sg = subgroups[subId];
                            const isSubActive = selectedSubgroup === sg.id;

                            return (
                              <button
                                key={sg.id}
                                className={
                                  "sidebar-pill " +
                                  (isSubActive ? "sidebar-pill-active" : "")
                                }
                                style={{ paddingLeft: "1.5rem" }}
                                onClick={() => {
                                  setSelectedSubgroup(sg.id);
                                  setView("labs");
                                }}
                              >
                                {sg.name}
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

      {/* ------------------------------- */}
      {/* PROGRESS OVERVIEW (BOTTOM ITEM) */}
      {/* ------------------------------- */}
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
            if (canShowProgress) setView("progress");
          }}
        >
          📊 Progress Overview
        </button>
      </div>
    </aside>
  );
}
