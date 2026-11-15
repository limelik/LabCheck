import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  // Hide header completely if NOT logged in
  if (!user) return null;

  const goHome = () => {
    if (user.role === "student") navigate("/student");
    else if (user.role === "teacher") navigate("/teacher");
    else if (user.role === "admin") navigate("/admin");
  };

  const handleLogout = async () => {
    setError("");
    try {
      await logout();
    } catch (err) {
      setError(err.message || "Could not log out.");
    }
  };

  return (
    <header className="top-bar">
      <button className="logo" onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer" }}>
        LabCheck
      </button>

      <nav>
        {error && <span className="auth-error" role="alert">{error}</span>}
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
