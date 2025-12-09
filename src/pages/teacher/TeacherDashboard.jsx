import { useState } from "react";
import DashboardLayout from "../../layout/DashboardLayout";

import TeacherSidebar from "./TeacherSidebar";
import TeacherLabManager from "./TeacherLabManager";
import TeacherProgressTable from "./TeacherProgressTable";

export default function TeacherDashboard() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);

  // "labs" or "progress"
  const [view, setView] = useState("labs");

  return (
    <DashboardLayout>
      <div className="teacher-layout">

        {/* LEFT SIDEBAR */}
        <TeacherSidebar
          selectedSubject={selectedSubject}
          selectedGroup={selectedGroup}
          selectedSubgroup={selectedSubgroup}
          setSelectedSubject={setSelectedSubject}
          setSelectedGroup={setSelectedGroup}
          setSelectedSubgroup={setSelectedSubgroup}
          view={view}
          setView={setView}
        />

        {/* MAIN CONTENT AREA */}
        <div className="teacher-main">

          {/* Nothing selected yet */}
          {!selectedSubject && (
            <p className="placeholder">
              Select a subject to begin.
            </p>
          )}

          {/* Subject selected but no group */}
          {selectedSubject && !selectedGroup && (
            <p className="placeholder">Select a group.</p>
          )}

          {/* Group selected but no subgroup */}
          {selectedSubject && selectedGroup && !selectedSubgroup && (
            <>
              <TeacherLabManager
                subjectId={selectedSubject}
                groupId={selectedGroup}
              />
              <p className="placeholder" style={{ marginTop: "1rem" }}>
                Select a subgroup on the left to open Progress Overview.
              </p>
            </>
          )}

          {/* SUBGROUP SELECTED → show whichever view is active */}
          {selectedSubject && selectedGroup && selectedSubgroup && view === "labs" && (
            <TeacherLabManager
              subjectId={selectedSubject}
              groupId={selectedGroup}
            />
          )}

          {selectedSubject && selectedGroup && selectedSubgroup && view === "progress" && (
            <TeacherProgressTable
              subjectId={selectedSubject}
              groupId={selectedGroup}
              subgroupId={selectedSubgroup}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
