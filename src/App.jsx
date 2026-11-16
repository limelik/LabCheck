import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { LabChangeProvider } from "./context/LabChangeContext.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AcademicStructure from "./pages/admin/AcademicStructure.jsx";
import AssignSubjects from "./pages/admin/AssignSubjects.jsx";
import AssignTeachers from "./pages/admin/AssignTeachers.jsx";
import ManageAccounts from "./pages/admin/ManageAccounts.jsx";

// Teacher & Student dashboards
import TeacherDashboard from "./pages/teacher/TeacherDashboard.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="auth-info">Loading account...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <LabChangeProvider>
      <div className={`app-root${user ? ` app-root-${user.role}` : ""}`}>
        <Header />

        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Login */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Student */}
          <Route path="/student/*" element={<RequireRole role="student"><StudentDashboard key={location.key} /></RequireRole>} />

          {/* Teacher */}
          <Route path="/teacher/*" element={<RequireRole role="teacher"><TeacherDashboard key={location.key} /></RequireRole>} />

          {/* Admin main */}
          <Route path="/admin/*" element={<RequireRole role="admin"><AdminDashboard key={location.key} /></RequireRole>} />

          {/* Admin subpages */}
          <Route path="/admin/academic-structure" element={<RequireRole role="admin"><AcademicStructure /></RequireRole>} />
          <Route path="/admin/course-offerings" element={<RequireRole role="admin"><AssignSubjects /></RequireRole>} />
          <Route path="/admin/teacher-coverage" element={<RequireRole role="admin"><AssignTeachers /></RequireRole>} />
          <Route path="/admin/accounts" element={<RequireRole role="admin"><ManageAccounts /></RequireRole>} />
          <Route path="/admin/approvals" element={<Navigate to="/admin/accounts" replace />} />
          <Route path="/admin/departments" element={<Navigate to="/admin/academic-structure" replace />} />
          <Route path="/admin/groups" element={<Navigate to="/admin/academic-structure" replace />} />
          <Route path="/admin/subjects" element={<Navigate to="/admin/course-offerings" replace />} />
          <Route path="/admin/assign-subjects" element={<Navigate to="/admin/course-offerings" replace />} />
          <Route path="/admin/assign-teachers" element={<Navigate to="/admin/teacher-coverage" replace />} />
          <Route path="/admin/student-placement" element={<Navigate to="/admin/course-offerings" replace />} />
          <Route path="/admin/lab-change-requests" element={<Navigate to="/admin/course-offerings" replace />} />
          <Route path="/admin/students" element={<Navigate to="/admin/academic-structure" replace />} />
          <Route path="/admin/teachers" element={<Navigate to="/admin/teacher-coverage" replace />} />
          {/* Fallback */}
          <Route path="*" element={<h2>Not Found</h2>} />
        </Routes>
      </div>
    </LabChangeProvider>
  );
}
