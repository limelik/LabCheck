import { useCallback, useEffect, useRef, useState } from "react";
import { PasswordResetContext } from "../context/PasswordResetContext.js";
import VerifyEmailPage from "../pages/VerifyEmailPage.jsx";

export default function PasswordResetProvider({ children }) {
  const [request, setRequest] = useState(null);
  const dialog = useRef(null);
  const openReset = useCallback(
    (email = "") => setRequest({ email, launcher: document.activeElement }),
    [],
  );
  const closeReset = useCallback(() => setRequest(null), []);
  useEffect(() => {
    if (!request) return;
    const element = dialog.current;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (request.launcher?.isConnected) request.launcher.focus();
    };
  }, [request]);
  return (
    <PasswordResetContext.Provider value={openReset}>
      {children}
      {request && (
        <dialog
          ref={dialog}
          className="password-reset-dialog"
          aria-labelledby="password-reset-title"
          onCancel={closeReset}
        >
          <button
            type="button"
            className="modal-close password-reset-close"
            aria-label="Close password reset"
            onClick={closeReset}
          >
            ×
          </button>
          <VerifyEmailPage
            recovery
            embedded
            initialEmail={request.email}
            onClose={closeReset}
          />
        </dialog>
      )}
    </PasswordResetContext.Provider>
  );
}
