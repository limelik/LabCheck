import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
export default function VerifyEmailPage({ recovery = false }) {
  const [params] = useSearchParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState(
      params.get("email") ||
        state?.email ||
        (recovery ? user?.email : "") ||
        "",
    ),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [step, setStep] = useState("email");
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function resend() {
    setBusy(true);
    setError("");
    try {
      const result = await api(
        recovery ? "/auth/password-reset/request" : "/auth/resend-verification",
        { method: "POST", body: { email } },
      );
      setMessage(result.message);
      if (recovery) {
        setStep("code");
        setCode("");
      }
      setCooldown(60);
    } catch (err) {
      setError(err.message);
      if (err.code === "RESEND_COOLDOWN") setCooldown(60);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (recovery && step === "email") {
      await resend();
      return;
    }
    if (recovery && step === "code") {
      setBusy(true);
      try {
        await api("/auth/password-reset/verify", {
          method: "POST",
          body: { email, code },
        });
        setStep("password");
        setMessage("");
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (recovery && password !== confirm) {
      setError("Passwords must match.");
      return;
    }
    setBusy(true);
    try {
      const result = await api(
        recovery ? "/auth/password-reset/confirm" : "/auth/verify-email",
        {
          method: "POST",
          body: recovery
            ? { email, code, newPassword: password }
            : { email, code },
        },
      );
      setMessage(result.message);
      setDone(true);
      setPassword("");
      setConfirm("");
      setCode("");
      if (
        recovery &&
        user?.email.toLowerCase() === email.trim().toLowerCase()
      ) {
        window.dispatchEvent(new Event("labcheck-session-expired"));
      }
    } catch (err) {
      setError(err.message);
      if (
        recovery &&
        [
          "OTP_EXPIRED",
          "OTP_USED",
          "OTP_ATTEMPTS",
          "OTP_INVALID",
          "OTP_INCORRECT",
        ].includes(err.code)
      )
        setStep("code");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">
          {recovery ? "Reset Password" : "Verify your email"}
        </h1>
        {params.has("token") && (
          <p className="auth-info">
            This older verification link is no longer valid. Enter your
            university email and request a six-digit code.
          </p>
        )}
        {!done && (
          <p>
            {recovery
              ? step === "email"
                ? "Enter your university email to receive a reset code."
                : step === "code"
                  ? "Enter the six-digit code from your email. Codes expire in 10 minutes."
                  : "Choose your new LabCheck password."
              : "Enter the six-digit code from your university email."}
          </p>
        )}
        {!done && (
          <form className="auth-form" onSubmit={submit}>
            {(!recovery || step === "email") && (
              <label className="auth-label">
                University Email
                <input
                  className="auth-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            {(!recovery || step === "code") && (
              <button
                className="auth-secondary-btn"
                type="button"
                disabled={busy || cooldown > 0 || !email}
                onClick={resend}
              >
                {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            )}
            {(!recovery || step === "code") && (
              <label className="auth-label">
                Verification Code
                <input
                  className="auth-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            )}
            {recovery && step === "password" && (
              <>
                <label className="auth-label">
                  New Password
                  <input
                    className="auth-input"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label className="auth-label">
                  Confirm Password
                  <input
                    className="auth-input"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              </>
            )}
            <button className="auth-primary-btn" disabled={busy}>
              {busy
                ? "Please wait…"
                : recovery
                  ? step === "email"
                    ? "Send code"
                    : step === "code"
                      ? "Verify code"
                      : "Reset Password"
                  : "Verify Email"}
            </button>
          </form>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="auth-info" role="status">
            {message}
          </p>
        )}
        {!done && recovery && step !== "email" && (
          <button
            type="button"
            className="auth-forgot-link"
            disabled={busy}
            onClick={() => {
              setStep("email");
              setCode("");
              setPassword("");
              setConfirm("");
              setMessage("");
              setError("");
            }}
          >
            Start over
          </button>
        )}
        {!done && user && (
          <p>
            <Link to={`/${user.role}`}>Back to dashboard</Link>
          </p>
        )}
        <Link to="/login">Go to login</Link>
        {!recovery && (
          <p>
            <Link to="/reset-password">Recover password</Link>
          </p>
        )}
      </div>
    </div>
  );
}
