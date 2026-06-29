import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

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

          {/* FORGOT PASSWORD (TEXT LINK) */}
          <div className="auth-forgot">
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => setShowResetModal(true)}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="auth-primary-btn">
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

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button
                className="modal-close"
                onClick={() => setShowResetModal(false)}
              >
                ×
              </button>
            </div>

            <ResetPasswordForm close={setShowResetModal} />
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
        <input className="auth-input" value={adminEmail} disabled />
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

/* --- RESET PASSWORD FORM (UI ONLY) --- */
function ResetPasswordForm({ close }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const sendCode = (e) => {
    e.preventDefault();
    console.log("Reset code sent to:", email);
    setStep(2);
  };

  const resetPassword = (e) => {
    e.preventDefault();
    console.log("Password reset:", { email, code, newPassword });
    close(false);
  };

  return (
    <form
      className="auth-form"
      onSubmit={step === 1 ? sendCode : resetPassword}
    >
      {step === 1 && (
        <>
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

          <button className="auth-primary-btn" type="submit">
            Send Reset Code
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <label className="auth-label">
            Reset Code
            <input
              className="auth-input"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>

          <label className="auth-label">
            New Password
            <input
              className="auth-input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <button className="auth-primary-btn" type="submit">
            Reset Password
          </button>
        </>
      )}
    </form>
  );
}
