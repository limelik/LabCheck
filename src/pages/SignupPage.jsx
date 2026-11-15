import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
export default function SignupPage() {
  const { signup } = useAuth(),
    navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [confirm, setConfirm] = useState(''),
    [detection, setDetection] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (form.role === 'student' && form.email.includes('@'))
        api(`/auth/detect-group?email=${encodeURIComponent(form.email)}`)
          .then((value) => {
            if (active) setDetection(value);
          })
          .catch((err) => {
            if (active) setDetection({ message: err.message });
          });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.email, form.role]);
  const change = (key, value) => {
    setForm({ ...form, [key]: value });
    if (key === 'email') setDetection(null);
  };
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== confirm) {
      setError('Passwords must match.');
      return;
    }
    setBusy(true);
    try {
      await signup(form);
      navigate(
        `/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-logo">LabCheck</div>
      <div className="auth-card">
        <div className="auth-toggle">
          {['student', 'teacher'].map((role) => (
            <button
              key={role}
              type="button"
              className={`auth-toggle-btn${form.role === role ? ' active' : ''}`}
              onClick={() => change('role', role)}
            >
              {role === 'student' ? 'Student' : 'Teacher'}
            </button>
          ))}
        </div>
        <h1 className="auth-title">Sign Up</h1>
        <form className="auth-form" onSubmit={submit}>
          {[
            ['firstName', 'First Name', 'text'],
            ['lastName', 'Surname', 'text'],
            ['email', 'University Email', 'email'],
            ['password', 'Password', 'password'],
          ].map(([key, label, type]) => (
            <label className="auth-label" key={key}>
              {label}
              <input
                className="auth-input"
                type={type}
                required
                minLength={key === 'password' ? 8 : undefined}
                maxLength={
                  key === 'password' ? 72 : key === 'email' ? 255 : 100
                }
                value={form[key]}
                onChange={(e) => change(key, e.target.value)}
                autoComplete={key === 'password' ? 'new-password' : undefined}
              />
            </label>
          ))}
          <label className="auth-label">
            Confirm Password
            <input
              className="auth-input"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {form.role === 'student' && (detection?.code || detection?.message) && (
            <div className="auth-info" aria-live="polite">
              {detection?.code && (
                <strong>
                  Detected group: {detection.code}
                  <br />
                </strong>
              )}
              {detection?.message}
            </div>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}{' '}
              <Link
                to={`/verify-email?email=${encodeURIComponent(form.email)}`}
              >
                Continue verification
              </Link>
            </p>
          )}
          <button className="auth-primary-btn" disabled={busy}>
            {busy ? 'Sending code…' : 'Create Account'}
          </button>
        </form>
        <p>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
