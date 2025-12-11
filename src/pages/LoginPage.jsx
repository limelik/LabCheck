import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const result = login({ email, password, role });

    if (!result.success) setError(result.message);
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

        {/* ERROR */}
        {error && <div className="auth-error">{error}</div>}

        {/* LOGIN FORM */}
        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
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
              placeholder="•••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button type="submit" className="auth-primary-btn">
            Log In
          </button>
        </form>

        {/* SIGNUP LINK */}
        <div className="auth-footer-row">
          <span>Don't have an account?</span>
          <a href="/signup" className="auth-link">Sign Up</a>
        </div>

        <div className="auth-divider"></div>

        {/* ADMIN LOGIN BUTTON */}
        <button
          className="auth-secondary-btn"
          onClick={() => setShowAdminModal(true)}
        >
          Log in as Administrator
        </button>
      </div>

      {/* ADMIN LOGIN MODAL */}
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

/* --- ADMIN LOGIN FORM (simple) --- */
function AdminLoginForm({ close }) {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const adminEmail = "admin@polytechnic.am";
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const result = login({
      email: adminEmail,
      password,
      role: "admin",
    });

    if (!result.success) setError(result.message);
    else close(false);
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && <div className="auth-error">{error}</div>}

      <label className="auth-label">
        Admin Email
        <input
          className="auth-input"
          value={adminEmail}
          disabled
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

      <button className="auth-primary-btn" type="submit">
        Log In as Admin
      </button>
    </form>
  );
}
