import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null); 

  const login = ({ email, password, role }) => {
    // email validation
    if (!email.endsWith("@polytechnic.am")) {
      return { success: false, message: "Email must end with @polytechnic.am" };
    }

    if (password.length < 3) {
      return { success: false, message: "Password is too short" };
    }

    const loggedUser = { email, role };
    setUser(loggedUser);

    if (role === "student") navigate("/student");
    if (role === "teacher") navigate("/teacher");
    if (role === "admin") navigate("/admin");

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
