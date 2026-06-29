import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { academicGroups } from "../data/labChangeSystem.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [role, setRole] = useState("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!email.endsWith("@polytechnic.am")) {
      setError("Email must end with @polytechnic.am");
      return;
    }

    if (role === "student" && !groupId) {
      setError("Please choose your academic group.");
      return;
    }

    try {
      signup({
        firstName,
        lastName,
        email,
        password,
        role,
        groupId: role === "student" ? groupId : undefined,
      });

      setInfo(
        role === "student"
          ? "Student account created. Lab placement will be generated automatically from academic group and surname order."
          : "Teacher account created. Teaching coverage appears after offering assignment."
      );

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message || "Signup failed.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">LabCheck</div>

      <div className="auth-card">
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

        <h2 className="auth-title">Sign Up</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            First Name
            <input
              type="text"
              className="auth-input"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
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
              required
            />
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
                >
                  <option value="">Select academic group</option>
                  {academicGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.code} - {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="auth-info">
                Lab group is not chosen manually. System places students automatically by surname
                order inside selected academic group.
              </div>
            </>
          )}

          {role === "teacher" && (
            <div className="auth-info">
              Department field removed. Teachers sign up directly, then receive offering coverage
              assignments later.
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button type="submit" className="auth-primary-btn">
            Create Account
          </button>
        </form>

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
