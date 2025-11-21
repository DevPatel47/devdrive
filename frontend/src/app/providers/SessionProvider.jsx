import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * @typedef {Object} SessionContextValue
 * @property {string} sessionState
 * @property {(value: string) => void} setSessionState
 * @property {{ username: string, role: string, status: string, maxStorageBytes: number | null, emailVerified: boolean | null } | null} sessionUser
 * @property {(value: object | null) => void} setSessionUser
 * @property {boolean} authLoading
 * @property {(value: boolean) => void} setAuthLoading
 * @property {string} authError
 * @property {(value: string) => void} setAuthError
 * @property {boolean} resendLoading
 * @property {(value: boolean) => void} setResendLoading
 * @property {object | null} registrationContext
 * @property {(value: object | null) => void} setRegistrationContext
 * @property {(payload: object) => void} applySessionUser
 * @property {() => void} resetAuthState
 * @property {() => void} handleSwitchToRegister
 * @property {() => void} handleSwitchToLogin
 */

const SessionContext = createContext(
  /** @type {SessionContextValue | null} */ (null)
);

/**
 * Provides session/auth state to descendant components.
 * @param {{ children: import("react").ReactNode }} props
 * @returns {JSX.Element}
 */
export const SessionProvider = ({ children }) => {
  const [sessionState, setSessionState] = useState("checking");
  const [sessionUser, setSessionUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [registrationContext, setRegistrationContext] = useState(null);

  useEffect(() => {
    setAuthError("");
  }, [sessionState]);

  const applySessionUser = useCallback((payload) => {
    if (!payload || !payload.username) return;
    setSessionUser({
      username: payload.username,
      role: payload.role || "user",
      status: payload.status,
      maxStorageBytes: payload.maxStorageBytes ?? null,
      emailVerified: payload.emailVerified ?? null,
    });
  }, []);

  const resetAuthState = useCallback(() => {
    setSessionState("login");
    setAuthError("");
    setAuthLoading(false);
    setResendLoading(false);
    setSessionUser(null);
    setRegistrationContext(null);
  }, []);

  const handleSwitchToRegister = useCallback(() => {
    setAuthError("");
    setResendLoading(false);
    setRegistrationContext(null);
    setSessionState("register");
  }, []);

  const handleSwitchToLogin = useCallback(() => {
    setAuthError("");
    setResendLoading(false);
    setRegistrationContext(null);
    setSessionState("login");
    setSessionUser(null);
  }, []);

  const value = useMemo(
    () => ({
      sessionState,
      setSessionState,
      sessionUser,
      setSessionUser,
      authLoading,
      setAuthLoading,
      authError,
      setAuthError,
      resendLoading,
      setResendLoading,
      registrationContext,
      setRegistrationContext,
      applySessionUser,
      resetAuthState,
      handleSwitchToRegister,
      handleSwitchToLogin,
    }),
    [
      sessionState,
      sessionUser,
      authLoading,
      authError,
      resendLoading,
      registrationContext,
      applySessionUser,
      resetAuthState,
      handleSwitchToRegister,
      handleSwitchToLogin,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export default SessionContext;
