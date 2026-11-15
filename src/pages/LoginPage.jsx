import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email, password, role });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <h1 className="auth-logo">LabCheck</h1>

      <div className="auth-card">
        {/* Toggle Teacher / Student */}
        <div className="auth-toggle">
          <button
            className={`auth-toggle-btn ${role === "teacher" ? "active" : ""}`}
            onClick={() => setRole("teacher")}
          >
            Teacher
          </button>

          <button
            className={`auth-toggle-btn ${role === "student" ? "active" : ""}`}
            onClick={() => setRole("student")}
          >
            Student
          </button>
        </div>

        <h2 className="auth-title">Log In</h2>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              required
              autoComplete="email"
              placeholder="example@polytechnic.am"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              required
              autoComplete="current-password"
              placeholder="•••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {/* FORGOT PASSWORD (TEXT LINK) */}
          <div className="auth-forgot">
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => navigate("/reset-password", { state: { email } })}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" disabled={busy} className="auth-primary-btn">
            Log In
          </button>
        </form>

        {/* SIGN UP */}
        <div className="auth-footer-row">
          <span>Don't have an account?</span>
          <a href="/signup" className="auth-link">
            Sign Up
          </a>
        </div>

        <div className="auth-divider"></div>

        {/* ADMIN LOGIN */}
        <button
          className="auth-secondary-btn"
          onClick={() => setShowAdminModal(true)}
        >
          Log in as Administrator
        </button>
      </div>

      {/* ADMIN MODAL */}
      {showAdminModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Administrator Login</h3>
              <button
                className="modal-close"
                onClick={() => setShowAdminModal(false)}
              >
                ×
              </button>
            </div>

            <AdminLoginForm close={setShowAdminModal} />
          </div>
        </div>
      )}
    </div>
  );
}

/* --- ADMIN LOGIN FORM --- */
function AdminLoginForm({ close }) {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login({ email: adminEmail, password, role: "admin" });
      close(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <label className="auth-label">
        Admin Email
        <input
          className="auth-input"
          type="email"
          value={adminEmail}
          onChange={(event) => setAdminEmail(event.target.value)}
          required
        />
      </label>

      <label className="auth-label">
        Password
        <input
          className="auth-input"
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <button className="auth-primary-btn" disabled={busy} type="submit">
        Log In as Admin
      </button>
    </form>
  );
}
