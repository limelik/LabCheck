import AdminSidebar from "./AdminSidebar.jsx";
import { useLabChange } from "../../context/LabChangeContext.jsx";

export default function AcademicStructure() {
  const {
    academicGroups,
    academicUnits,
    getLabGroupsForAcademicGroup,
    maxStudentsPerLab,
    specializations,
  } = useLabChange();

  return (
    <div className="teacher-layout">
      <AdminSidebar />

      <main className="teacher-main">
        <h1 className="page-title">Academic Structure</h1>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>System rules</h3>
          <p className="student-helper-text" style={{ margin: 0 }}>
            Academic tree stays strict: academic units -&gt; specializations -&gt; academic groups
            -&gt; lab groups. Lab groups auto-size from cohort count with minimum 3 labs and max{" "}
            {maxStudentsPerLab} students per lab.
          </p>
        </div>

        <div className="structure-stack">
          {academicUnits.map((unit) => {
            const unitSpecializations = specializations.filter(
              (specialization) => specialization.academicUnitId === unit.id
            );

            return (
              <section key={unit.id} className="student-card">
                <div className="placement-card-header">
                  <div>
                    <h2 className="student-card-title" style={{ marginBottom: "0.35rem" }}>
                      {unit.name}
                    </h2>
                    <div className="placement-meta">{unit.code}</div>
                  </div>
                  <span className="placement-chip">
                    {unitSpecializations.length} specializations
                  </span>
                </div>

                <div className="structure-branch-list">
                  {unitSpecializations.map((specialization) => {
                    const specializationGroups = academicGroups.filter(
                      (group) => group.specializationId === specialization.id
                    );

                    return (
                      <div key={specialization.id} className="structure-branch">
                        <div className="structure-node">
                          <strong>{specialization.name}</strong>
                          <span className="placement-meta">{specialization.code}</span>
                        </div>

                        <div className="structure-group-grid">
                          {specializationGroups.map((group) => {
                            const groupLabGroups = getLabGroupsForAcademicGroup(group.id);

                            return (
                              <article key={group.id} className="placement-stat">
                                <div className="placement-stat-label">{group.code}</div>
                                <div className="placement-stat-value" style={{ fontSize: "1rem" }}>
                                  {group.studentCount} students
                                </div>
                                <div className="placement-meta" style={{ marginTop: "0.4rem" }}>
                                  Auto labs: {group.recommendedLabCount}
                                </div>
                                <div className="chip-row" style={{ marginTop: "0.65rem" }}>
                                  {groupLabGroups.map((labGroup) => (
                                    <span key={labGroup.id} className="sidebar-inline-chip">
                                      {labGroup.code}
                                    </span>
                                  ))}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
