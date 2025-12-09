import { Routes, Route, Navigate, Link } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import TeacherDashboard from "./pages/teacher/TeacherDashboard.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";

export const AppHeader = () => (
  <header className="top-bar">
    <Link to="/" className="logo">
      LabCheck
    </Link>
    <nav>
      <Link to="/login">Login</Link>
      <Link to="/student">Student</Link>
      <Link to="/teacher">Teacher</Link>
      <Link to="/admin">Admin</Link>
    </nav>
  </header>
);

export default function App() {
  return (
    <div className="app-root">
      <AppHeader />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<h2>Not found</h2>} />
      </Routes>
    </div>
  );
}
