// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLoginModal from "../components/AdminLoginModal.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState("teacher"); // "teacher" | "student"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.endsWith("@polytechnic.am")) {
      setError("Email must end with @polytechnic.am");
      return;
    }

    const user = login(email, password);

    if (!user) {
      setError("Invalid email or password.");
      return;
    }

    if (user.role !== role) {
      setError(`This account is not registered as a ${role}.`);
      return;
    }

    // Redirect based on role
    if (role === "student") {
      navigate("/student/home");
    } else if (role === "teacher") {
      navigate("/teacher/home");
    }
    // `remember` is ignored now, but kept in UI
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">LabCheck</div>

      <div className="auth-card">
        {/* Role toggle */}
        <div className="auth-toggle">
          <button
            type="button"
            className={
              "auth-toggle-btn" + (role === "teacher" ? " active" : "")
            }
            onClick={() => setRole("teacher")}
          >
            Teacher
          </button>
          <button
            type="button"
            className={
              "auth-toggle-btn" + (role === "student" ? " active" : "")
            }
            onClick={() => setRole("student")}
          >
            Student
          </button>
        </div>

        <h2 className="auth-title">Log In</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@polytechnic.am"
              required
            />
          </label>

          <label className="auth-label">
            Password
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <div className="auth-row">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember Me
            </label>
            <button type="button" className="link-button">
              Forgot Password?
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-primary-btn">
            Log in
          </button>
        </form>

        <div className="auth-footer-row">
          <span>Don&apos;t have an account?</span>
          <Link to="/signup" className="auth-link">
            Sign up
          </Link>
        </div>

        <div className="auth-divider" />

        <button
          type="button"
          className="auth-secondary-btn"
          onClick={() => setShowAdminModal(true)}
        >
          Log in as Administrator
        </button>
      </div>

      {showAdminModal && (
        <AdminLoginModal onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  );
}
