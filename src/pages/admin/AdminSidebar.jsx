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
        <NavLink to="/admin/academic-structure" className={itemStyle}>
          Academic Structure
        </NavLink>
        <NavLink to="/admin/course-offerings" className={itemStyle}>
          Course Offerings
        </NavLink>
        <NavLink to="/admin/teacher-coverage" className={itemStyle}>
          Teacher Coverage
        </NavLink>
      </nav>
    </aside>
  );
}
