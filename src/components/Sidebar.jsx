import SidebarItem from "./SidebarItem.jsx";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">LabCheck</h2>
      <nav className="sidebar-nav">
        <SidebarItem to="/student" label="Student" />
        <SidebarItem to="/teacher" label="Teacher" />
        <SidebarItem to="/admin" label="Admin" />
      </nav>
    </aside>
  );
}
