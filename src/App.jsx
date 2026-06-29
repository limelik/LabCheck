import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import { LabChangeProvider } from "./context/LabChangeContext.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AcademicStructure from "./pages/admin/AcademicStructure.jsx";
import AssignSubjects from "./pages/admin/AssignSubjects.jsx";
import AssignTeachers from "./pages/admin/AssignTeachers.jsx";

// Teacher & Student dashboards
import TeacherDashboard from "./pages/teacher/TeacherDashboard.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";

export default function App() {
  return (
    <LabChangeProvider>
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
          <Route path="/admin/academic-structure" element={<AcademicStructure />} />
          <Route path="/admin/course-offerings" element={<AssignSubjects />} />
          <Route path="/admin/teacher-coverage" element={<AssignTeachers />} />
          <Route path="/admin/approvals" element={<Navigate to="/admin" replace />} />
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
