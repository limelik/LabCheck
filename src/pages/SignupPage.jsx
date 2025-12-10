// src/pages/SignupPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { departments } from "../data/departments.js";
import { groups } from "../data/groups.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [role, setRole] = useState("student"); // "student" | "teacher"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState("");
  const [subgroupId, setSubgroupId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const selectedGroup = groups.find((g) => g.id === groupId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.endsWith("@polytechnic.am")) {
      setError("Email must end with @polytechnic.am");
      return;
    }

    if (role === "student" && (!groupId || !subgroupId)) {
      setError("Please choose your group and subgroup.");
      return;
    }

    if (role === "teacher" && !departmentId) {
      setError("Please choose your department.");
      return;
    }

    try {
      signup({
        name,
        email,
        password,
        role,
        groupId: role === "student" ? groupId : undefined,
        subgroupId: role === "student" ? subgroupId : undefined,
        departmentId: role === "teacher" ? departmentId : undefined,
      });
      setInfo(
        "Your registration has been sent for approval. You can log in after an administrator approves your account."
      );
      // Small UX: go back to login after a moment
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message || "Signup failed.");
    }
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
              "auth-toggle-btn" + (role === "student" ? " active" : "")
            }
            onClick={() => setRole("student")}
          >
            Student
          </button>
          <button
            type="button"
            className={
              "auth-toggle-btn" + (role === "teacher" ? " active" : "")
            }
            onClick={() => setRole("teacher")}
          >
            Teacher
          </button>
        </div>

        <h2 className="auth-title">Sign Up</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Full Name
            <input
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

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

          {role === "student" && (
            <>
              <label className="auth-label">
                Group
                <select
                  className="auth-input"
                  value={groupId}
                  onChange={(e) => {
                    setGroupId(e.target.value);
                    setSubgroupId("");
                  }}
                  required
                >
                  <option value="">Select group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="auth-label">
                Subgroup
                <select
                  className="auth-input"
                  value={subgroupId}
                  onChange={(e) => setSubgroupId(e.target.value)}
                  required
                  disabled={!selectedGroup}
                >
                  <option value="">Select subgroup</option>
                  {selectedGroup?.subgroups.map((sg) => (
                    <option key={sg.id} value={sg.id}>
                      {sg.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {role === "teacher" && (
            <label className="auth-label">
              Department
              <select
                className="auth-input"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button type="submit" className="auth-primary-btn">
            Submit for Approval
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
