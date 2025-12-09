import { NavLink } from "react-router-dom";

export default function SidebarItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "sidebar-item" + (isActive ? " sidebar-item-active" : "")
      }
    >
      {label}
    </NavLink>
  );
}
