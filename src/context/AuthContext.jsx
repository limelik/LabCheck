import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
const SESSION_KEY = "labcheck.user";
const ROLES = new Set(["student", "teacher", "admin"]);

function getStoredUser() {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SESSION_KEY));
    return stored && ROLES.has(stored.role) &&
      typeof stored.email === "string" && stored.email.endsWith("@polytechnic.am")
      ? { email: stored.email, role: stored.role }
      : null;
  } catch {
    return null;
  }
}
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(getStoredUser);

  const login = ({ email, password, role }) => {
    // email validation
    if (!email.endsWith("@polytechnic.am")) {
      return { success: false, message: "Email must end with @polytechnic.am" };
    }

    if (password.length < 3) {
      return { success: false, message: "Password is too short" };
    }

    const loggedUser = { email, role };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(loggedUser));
    setUser(loggedUser);

    if (role === "student") navigate("/student");
    if (role === "teacher") navigate("/teacher");
    if (role === "admin") navigate("/admin");

    return { success: true };
  };

  const signup = ({
    email,
    password,
    role,
  }) => {
    if (!email.endsWith("@polytechnic.am")) {
      throw new Error("Email must end with @polytechnic.am");
    }

    if (password.length < 3) {
      throw new Error("Password is too short");
    }

    return {
      success: true,
      role,
    };
  };

  const logout = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
