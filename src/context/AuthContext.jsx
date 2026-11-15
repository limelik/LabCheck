import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionRevision = useRef(0);

  useEffect(() => {
    let active = true;
    const refreshSession = () => {
      const revision = sessionRevision.current;
      return api('/auth/me')
        .then(({ user: account }) => {
          if (active && revision === sessionRevision.current)
            setUser((previous) =>
              JSON.stringify(previous) === JSON.stringify(account)
                ? previous
                : account,
            );
        })
        .catch((error) => {
          if (
            active &&
            revision === sessionRevision.current &&
            error.status === 401
          )
            setUser(null);
        });
    };
    const expire = () => {
      sessionRevision.current++;
      setUser(null);
    };
    window.addEventListener('focus', refreshSession);
    window.addEventListener('labcheck-session-expired', expire);
    const interval = window.setInterval(refreshSession, 60000);
    refreshSession().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshSession);
      window.removeEventListener('labcheck-session-expired', expire);
    };
  }, []);

  const login = async ({ email, password, role }) => {
    sessionRevision.current++;
    const result = await api('/auth/login', {
      method: 'POST',
      body: { email, password, role },
    });
    sessionRevision.current++;
    setUser(result.user);
    setLoading(false);
    navigate(`/${result.user.role}`);
    return result;
  };

  const signup = (data) => api('/auth/signup', { method: 'POST', body: data });

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    sessionRevision.current++;
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
