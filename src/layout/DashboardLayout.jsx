import Sidebar from "../components/Sidebar.jsx";

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content">{children}</main>
    </div>
  );
}
