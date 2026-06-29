// src/components/AdminLoginModal.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminLoginModal({ onClose }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@polytechnic.am");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setError("");

    const user = login(email, password);

    if (!user || user.role !== "admin") {
      setError("Invalid administrator credentials.");
      return;
    }

    navigate("/admin");
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Administrator Login</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="auth-form" onSubmit={handleAdminLogin}>
          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-primary-btn">
            Log in as Admin
          </button>
        </form>
      </div>
    </div>
  );
}
