import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Hide header completely if NOT logged in
  if (!user) return null;

  const goHome = () => {
    if (user.role === "student") navigate("/student");
    else if (user.role === "teacher") navigate("/teacher");
    else if (user.role === "admin") navigate("/admin");
  };

  return (
    <header className="top-bar">
      <button
        className="logo"
        onClick={goHome}
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        LabCheck
      </button>

      {error && <p role="alert">{error}</p>}
      <nav>
        {["student", "teacher"].includes(user.role) && (
          <button
            className="logout-btn"
            disabled={busy}
            onClick={() =>
              navigate("/reset-password", { state: { email: user.email } })
            }
          >
            Reset Password
          </button>
        )}
        <button className="logout-btn" disabled={busy} onClick={signOut}>
          Logout
        </button>
      </nav>
    </header>
  );
}
