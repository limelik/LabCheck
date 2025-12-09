import { useState } from "react";
import DashboardLayout from "../../layout/DashboardLayout";
import TeacherSidebar from "./TeacherSidebar";
import TeacherLabManager from "./TeacherLabManager";

export default function TeacherDashboard() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);
  const [view, setView] = useState("labs"); // labs | progress

  return (
    <DashboardLayout>
      <div className="teacher-layout">
        <TeacherSidebar
          selectedSubject={selectedSubject}
          selectedGroup={selectedGroup}
          selectedSubgroup={selectedSubgroup}
          setSelectedSubject={setSelectedSubject}
          setSelectedGroup={setSelectedGroup}
          setSelectedSubgroup={setSelectedSubgroup}
          setView={setView}
        />

        <div className="teacher-main">
          {!selectedSubject && (
            <p className="placeholder">Select a subject to begin.</p>
          )}

          {selectedSubject && selectedGroup && !selectedSubgroup && (
            <p className="placeholder">Select a subgroup.</p>
          )}

          
            {selectedSubgroup && view === "labs" && (
            <TeacherLabManager subjectId={selectedSubject} groupId={selectedGroup} />
            )}


          {selectedSubgroup && view === "progress" && (
            <p className="placeholder">
              Progress Overview UI will appear here (next step).
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
