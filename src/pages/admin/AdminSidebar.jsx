import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const itemStyle = ({ isActive }) =>
    "subject-pill" + (isActive ? " subject-pill-active" : "");

  return (
    <aside className="student-sidebar">
      <h3 className="sidebar-section-title">Admin Panel</h3>

      <nav className="student-subject-list">
        <NavLink to="/admin" className={itemStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/approvals" className={itemStyle}>
          Pending Approvals
        </NavLink>
        <NavLink to="/admin/departments" className={itemStyle}>
          Departments
        </NavLink>
        <NavLink to="/admin/groups" className={itemStyle}>
          Groups
        </NavLink>
        <NavLink to="/admin/subjects" className={itemStyle}>
          Subjects
        </NavLink>
        <NavLink to="/admin/assign-teachers" className={itemStyle}>
          Teacher Assignments
        </NavLink>
        <NavLink to="/admin/assign-subjects" className={itemStyle}>
          Group Assignments
        </NavLink>
        <NavLink to="/admin/students" className={itemStyle}>
          Students
        </NavLink>
        <NavLink to="/admin/teachers" className={itemStyle}>
          Teachers
        </NavLink>
      </nav>
    </aside>
  );
}
