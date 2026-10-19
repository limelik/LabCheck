import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/me').then(({ user: account }) => setUser(account)).catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async ({ email, password, role }) => {
    const result = await api('/auth/login', { method: 'POST', body: { email, password, role } });
    setUser(result.user);
    navigate(`/${result.user.role}`);
    return result;
  };

  const signup = (data) => api('/auth/signup', { method: 'POST', body: {
    firstName: data.firstName, lastName: data.lastName, email: data.email,
    password: data.password, role: data.role,
    ...(data.role === 'student' ? { academicGroupId: Number(data.groupId) } : {}),
  } });

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); }
    finally { setUser(null); navigate('/login'); }
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
    {children}
  </AuthContext.Provider>;
}
