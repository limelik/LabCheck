import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Approved users
  const [users, setUsers] = useState([
    // Example admin account so you can log in immediately
    {
      id: 1,
      name: "System Admin",
      email: "admin@polytechnic.am",
      password: "admin123",
      role: "admin",
    },
  ]);

  // Users that signed up but not approved yet
  const [pendingUsers, setPendingUsers] = useState([]);

  // Logged-in user
  const [currentUser, setCurrentUser] = useState(null);

  // Helper: check polytechnic email
  const isPolyEmail = (email) =>
    typeof email === "string" && email.endsWith("@polytechnic.am");

  // ---------- SIGNUP (goes to pending list) ----------
  const signup = (newUser) => {
    if (!isPolyEmail(newUser.email)) {
      throw new Error("Email must end with @polytechnic.am");
    }

    setPendingUsers((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...newUser,
      },
    ]);
  };

  // ---------- LOGIN (approved users only) ----------
  const login = (email, password) => {
    const user = users.find(
      (u) => u.email === email && u.password === password
    );
    if (!user) return null;

    setCurrentUser(user);
    return user;
  };

  const logout = () => setCurrentUser(null);

  // ---------- ADMIN: Approve / Reject ----------
  const approveUser = (id) => {
    const user = pendingUsers.find((u) => u.id === id);
    if (!user) return;

    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    setUsers((prev) => [...prev, user]);
  };

  const rejectUser = (id) => {
    setPendingUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        users,
        pendingUsers,
        currentUser,
        signup,
        login,
        logout,
        approveUser,
        rejectUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
