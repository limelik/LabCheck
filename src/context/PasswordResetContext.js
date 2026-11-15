import { createContext, useContext } from "react";
export const PasswordResetContext = createContext(null);
export const usePasswordReset = () => useContext(PasswordResetContext);
