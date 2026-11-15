import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../lib/api.js";

export default function SignupPage() {
  const { signup, verifyEmail } = useAuth();

  const [role, setRole] = useState("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [groups, setGroups] = useState([]);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    apiRequest("/api/academic-groups")
      .then(({ groups: academicGroups }) => setGroups(academicGroups))
      .catch((err) => setError(err.message || "Could not load academic groups."));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const result = await signup({
        firstName,
        lastName,
        email,
        password,
        role,
        groupCode: role === "student" ? groupId : undefined,
      });
      setVerificationPending(true);
      setInfo(result.message);
    } catch (err) {
      if (err.data?.accountCreated) setVerificationPending(true);
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const result = await apiRequest("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setInfo(result.message);
    } catch (err) {
      setError(err.message || "Could not resend the verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const result = await verifyEmail({ email, code: verificationCode });
      setVerified(true);
      setApproved(result.approved);
      setInfo(result.message);
    } catch (err) {
      setError(err.message || "Email verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">LabCheck</div>

      <div className="auth-card">
        {!verificationPending && (
          <div className="auth-toggle">
            <button
              type="button"
              className={"auth-toggle-btn" + (role === "student" ? " active" : "")}
              onClick={() => setRole("student")}
            >
              Student
            </button>
            <button
              type="button"
              className={"auth-toggle-btn" + (role === "teacher" ? " active" : "")}
              onClick={() => setRole("teacher")}
            >
              Teacher
            </button>
          </div>
        )}

        <h2 className="auth-title">{verificationPending ? "Verify Email" : "Sign Up"}</h2>

        {verificationPending ? (
          <form className="auth-form" onSubmit={handleVerify}>
            <div className="auth-info">Enter the 6-digit code sent to {email}.</div>
            <label className="auth-label">
              Verification Code
              <input
                type="text"
                className="auth-input"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                disabled={verified}
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            {info && <div className="auth-info">{info}</div>}
            {!verified && (
              <>
                <button type="submit" className="auth-primary-btn" disabled={loading}>
                  {loading ? "Verifying..." : "Verify Email"}
                </button>
                <button type="button" className="auth-forgot-link" onClick={handleResend} disabled={loading}>
                  Resend verification code
                </button>
              </>
            )}
            {verified && approved && (
              <Link to="/login" className="auth-primary-btn">
                Go to Log In
              </Link>
            )}
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">
              First Name
              <input
                type="text"
                className="auth-input"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={100}
                autoComplete="given-name"
                required
              />
            </label>

            <label className="auth-label">
              Last Name
              <input
                type="text"
                className="auth-input"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={100}
                autoComplete="family-name"
                required
              />
            </label>

            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@polytechnic.am"
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-label">
              Password
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={10}
                autoComplete="new-password"
                required
              />
              <small>Use at least 10 characters.</small>
            </label>

            {role === "student" && (
              <>
                <label className="auth-label">
                  Academic Group
                  <select
                    className="auth-input"
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    required
                    disabled={!groups.length}
                  >
                    <option value="">Select academic group</option>
                    {groups.map((group) => (
                      <option key={group.code} value={group.code}>
                        {group.code} - {group.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="auth-info">
                  Lab group is not chosen manually. The system places students automatically
                  inside their academic group.
                </div>
              </>
            )}

            {role === "teacher" && (
              <div className="auth-info">
                Teacher accounts require administrator approval after email verification.
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}
            {info && <div className="auth-info">{info}</div>}

            <button type="submit" className="auth-primary-btn" disabled={loading || (role === "student" && !groups.length)}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="auth-footer-row">
          <span>Already have an account?</span>
          <Link to="/login" className="auth-link">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
