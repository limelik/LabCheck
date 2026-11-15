import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api.js";

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    apiRequest("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        if (error.status !== 401) {
          console.error("Could not restore the LabCheck session:", error);
        }
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async ({ email, password, role }) => {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    setUser(result.user);
    navigate(`/${result.user.role}`);
    return result;
  };

  const signup = (details) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(details),
    });

  const verifyEmail = (details) =>
    apiRequest("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(details),
    });

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup, verifyEmail }}>
      {children}
    </AuthContext.Provider>
  );
}
