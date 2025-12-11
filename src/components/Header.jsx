import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Hide header completely if NOT logged in
  if (!user) return null;

  const goHome = () => {
    if (user.role === "student") navigate("/student/home");
    else if (user.role === "teacher") navigate("/teacher/home");
    else if (user.role === "admin") navigate("/admin");
  };

  return (
    <header className="top-bar">
      <button className="logo" onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer" }}>
        LabCheck
      </button>

      <nav>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
