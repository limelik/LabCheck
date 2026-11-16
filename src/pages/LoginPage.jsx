import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

export default function LoginPage() {
  const { login } = useAuth();

  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password, role });
    } catch (err) {
      setError(err.message || "Login failed.");
    }
  };

  return (
    <div className="auth-page auth-login-page">
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-login-brand">
            <span className="auth-login-mark" aria-hidden="true">L</span>
            <span>LabCheck</span>
          </div>

          <div className="auth-card-intro">
            <p className="auth-card-kicker">Welcome back</p>
            <h2 className="auth-title">Sign in</h2>
            <p className="auth-card-description">Choose your account type to continue.</p>
          </div>

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
  const [adminEmail, setAdminEmail] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email: adminEmail, password, role: "admin" });
      close(false);
    } catch (err) {
      setError(err.message || "Login failed.");
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      {error && <div className="auth-error">{error}</div>}

      <label className="auth-label">
        Admin Email
        <input className="auth-input" type="email" value={adminEmail} required
          onChange={(event) => setAdminEmail(event.target.value)} />
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

function ResetPasswordForm({ close }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStep(2);
    } catch (requestError) {
      setError(requestError.message || "Could not send a reset code.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await apiRequest("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ email, code, password: newPassword }),
      });
      alert(result.message);
      close(false);
    } catch (requestError) {
      setError(requestError.message || "Could not reset the password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="auth-form"
      onSubmit={step === 1 ? sendCode : resetPassword}
    >
      {error && <div className="auth-error" role="alert">{error}</div>}
      {step === 1 && (
        <>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              placeholder="example@polytechnic.am"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <button className="auth-primary-btn" type="submit" disabled={submitting}>
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
              inputMode="numeric"
              maxLength={6}
              required
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
              minLength={10}
              maxLength={72}
              required
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <button className="auth-primary-btn" type="submit" disabled={submitting}>
            Reset Password
          </button>
          <button className="auth-forgot-link" type="button" disabled={submitting}
            onClick={sendCode}>
            Send a new code
          </button>
        </>
      )}
    </form>
  );
}
