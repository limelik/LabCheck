export default function DashboardLayout({ children }) {
  return (
    <div className="app-root">
      {/* TOP BAR (GLOBAL HEADER) */}
      

      {/* MAIN CONTENT */}
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
