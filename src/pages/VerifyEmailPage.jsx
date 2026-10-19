import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('Verifying your email…');
  const started = useRef(false);
  const token = params.get('token');
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => setMessage('Email verified. You can now log in.'))
      .catch((error) => setMessage(error.message));
  }, [token]);
  return <div className="auth-page"><div className="auth-card">
    <h1 className="auth-title">Email verification</h1>
    <p>{token ? message : 'Verification link is missing its token.'}</p><Link to="/login" className="auth-link">Go to login</Link>
  </div></div>;
}
