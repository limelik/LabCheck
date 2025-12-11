import { Routes, Route, Navigate, Link } from "react-router-dom";
import Header from "./components/Header.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import PendingApprovals from "./pages/admin/PendingApprovals.jsx";
import ManageDepartments from "./pages/admin/ManageDepartments.jsx";
import ManageGroups from "./pages/admin/ManageGroups.jsx";
import ManageSubjects from "./pages/admin/ManageSubjects.jsx";
import AssignSubjects from "./pages/admin/AssignSubjects.jsx";
import AssignTeachers from "./pages/admin/AssignTeachers.jsx";
import ManageStudents from "./pages/admin/ManageStudents.jsx";
import ManageTeachers from "./pages/admin/ManageTeachers.jsx";

// Teacher & Student dashboards
import TeacherDashboard from "./pages/teacher/TeacherDashboard.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";

export default function App() {
  return (
    <div className="app-root">
      <Header />

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Student */}
        <Route path="/student/*" element={<StudentDashboard />} />

        {/* Teacher */}
        <Route path="/teacher/*" element={<TeacherDashboard />} />

        {/* Admin main */}
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* Admin subpages */}
        <Route path="/admin/approvals" element={<PendingApprovals />} />
        <Route path="/admin/departments" element={<ManageDepartments />} />
        <Route path="/admin/groups" element={<ManageGroups />} />
        <Route path="/admin/subjects" element={<ManageSubjects />} />
        <Route path="/admin/assign-subjects" element={<AssignSubjects />} />
        <Route path="/admin/assign-teachers" element={<AssignTeachers />} />
        <Route path="/admin/students" element={<ManageStudents />} />
        <Route path="/admin/teachers" element={<ManageTeachers />} />
        {/* Fallback */}
        <Route path="*" element={<h2>Not Found</h2>} />
      </Routes>
    </div>
  );
}
