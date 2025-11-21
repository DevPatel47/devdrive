import { useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import useSession from "../../../app/hooks/useSession.js";
import {
  login as loginRequest,
  registerInit,
  verifyEmailOtp,
  registerVerify,
  verifyMfa,
  fetchSession,
  logout as logoutRequest,
  resendEmailOtp,
} from "../../../api/auth";
import { setUnauthorizedHandler } from "../../../api/client";

/**
 * Extracts the most relevant error message from an Axios error response.
 * @param {import("axios").AxiosError|Error} error - Error thrown from API calls.
 * @param {string} fallbackMessage - Message used when the response lacks details.
 * @returns {string} A user-friendly error message.
 */
const getErrorMessage = (error, fallbackMessage) => {
  const apiMessage =
    typeof error?.response?.data?.error === "string"
      ? error?.response?.data?.error
      : error?.response?.data?.error?.message;
  return (
    apiMessage ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

/**
 * Orchestrates the authentication experience (login, registration, MFA, session bootstrapping).
 * @param {Object} [params]
 * @param {Function} [params.onSessionReset] - Optional handler invoked when auth state needs a reset.
 * @returns {{
 *   handleLoginSubmit: Function,
 *   handleRegisterSubmit: Function,
 *   handleEmailOtpSubmit: Function,
 *   handleResendEmailOtp: Function,
 *   handleRegisterVerify: Function,
 *   handleMfaSubmit: Function,
 *   handleMfaBack: Function,
 *   handleLogout: Function,
 * }} Public API for the auth forms.
 */
const useAuthFlow = ({ onSessionReset } = {}) => {
  const {
    sessionState,
    setSessionState,
    authLoading,
    setAuthLoading,
    authError,
    setAuthError,
    resendLoading,
    setResendLoading,
    registrationContext,
    setRegistrationContext,
    applySessionUser,
    handleSwitchToRegister,
    handleSwitchToLogin,
  } = useSession();

  const handleUnauthorized = useCallback(() => {
    if (onSessionReset) {
      onSessionReset({
        notify: true,
        message: "Session expired. Please sign in again.",
      });
    } else {
      toast.error("Session expired. Please sign in again.");
      handleSwitchToLogin();
    }
  }, [handleSwitchToLogin, onSessionReset]);

  useEffect(() => {
    // Register a global handler so 401 responses always funnel through this hook.
    setUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  useEffect(() => {
    let isActive = true;
    const bootstrap = async () => {
      setAuthLoading(true);
      try {
        const session = await fetchSession();
        if (!isActive) return;
        if (session?.username) {
          applySessionUser(session);
          setSessionState("ready");
        } else {
          setSessionState("login");
        }
      } catch (_error) {
        if (isActive) {
          setSessionState("login");
        }
      } finally {
        if (isActive) {
          setAuthLoading(false);
        }
      }
    };
    bootstrap();
    return () => {
      isActive = false;
    };
  }, [applySessionUser, setAuthLoading, setSessionState]);

  /**
   * Handles credential submission for the login surface.
   * @param {{username: string, password: string}} params
   */
  const handleLoginSubmit = useCallback(
    async ({ username, password }) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const response = await loginRequest({ username, password });
        if (response?.next === "mfa") {
          setSessionState("mfa");
        } else {
          setSessionState("login");
        }
      } catch (error) {
        setAuthError(getErrorMessage(error, "Unable to verify credentials"));
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthError, setAuthLoading, setSessionState]
  );

  /**
   * Starts the registration funnel, requesting email verification if needed.
   * @param {{username: string, password: string}} params
   */
  const handleRegisterSubmit = useCallback(
    async ({ username, password }) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const data = await registerInit({ username, password });
        if (data?.status === "email_verified") {
          setRegistrationContext({
            username: data?.email || username,
            email: data?.email || username,
            verificationToken: data.verificationToken,
            qrCodeDataUrl: data.qrCodeDataUrl,
            otpauthUrl: data.otpauthUrl,
            secret: data.secret,
          });
          setSessionState("register-mfa");
          toast.success("Email already verified. Continue with MFA setup.");
          return;
        }
        if (data?.status !== "email_verification_required") {
          throw new Error(
            data?.message || "Unexpected response while starting registration"
          );
        }
        const now = Date.now();
        const codeExpiresIn = data?.codeExpiresIn ?? 120;
        const resendAvailableIn = data?.resendAvailableIn ?? 90;
        setRegistrationContext({
          username: data?.email || username,
          email: data?.email || username,
          verificationToken: data.verificationToken,
          qrCodeDataUrl: null,
          otpauthUrl: null,
          secret: null,
          codeExpiresAt: now + codeExpiresIn * 1000,
          resendAvailableAt: now + resendAvailableIn * 1000,
        });
        setSessionState("register-email-otp");
        toast.success("We sent a verification code to your email");
      } catch (error) {
        setAuthError(getErrorMessage(error, "Unable to start registration"));
      } finally {
        setAuthLoading(false);
      }
    },
    [setAuthError, setAuthLoading, setRegistrationContext, setSessionState]
  );

  /**
   * Confirms the email OTP and advances the flow to MFA enrollment.
   * @param {{code: string}} params
   */
  const handleEmailOtpSubmit = useCallback(
    async ({ code }) => {
      if (!registrationContext?.verificationToken) {
        setAuthError("Verification session expired. Please start over.");
        setSessionState("register");
        return;
      }
      setAuthLoading(true);
      setAuthError("");
      try {
        const result = await verifyEmailOtp({
          code,
          token: registrationContext.verificationToken,
        });
        setRegistrationContext((prev) => ({
          ...prev,
          verificationToken: result.verificationToken,
          qrCodeDataUrl: result.qrCodeDataUrl,
          otpauthUrl: result.otpauthUrl,
          secret: result.secret,
          codeExpiresAt: undefined,
          resendAvailableAt: undefined,
        }));
        setSessionState("register-mfa");
        toast.success("Email verified. Scan the QR code to finish setup.");
      } catch (error) {
        setAuthError(getErrorMessage(error, "Invalid verification code"));
      } finally {
        setAuthLoading(false);
      }
    },
    [
      registrationContext,
      setAuthError,
      setAuthLoading,
      setRegistrationContext,
      setSessionState,
    ]
  );

  /**
   * Resends the email OTP when the cooldown window allows it.
   */
  const handleResendEmailOtp = useCallback(async () => {
    if (!registrationContext?.verificationToken) {
      setAuthError("Verification session expired. Please start over.");
      setSessionState("register");
      return;
    }
    setResendLoading(true);
    try {
      const result = await resendEmailOtp({
        token: registrationContext.verificationToken,
      });
      const now = Date.now();
      const codeExpiresIn = result?.codeExpiresIn ?? 120;
      const resendAvailableIn = result?.resendAvailableIn ?? 90;
      setRegistrationContext((prev) =>
        prev
          ? {
              ...prev,
              verificationToken: result.verificationToken,
              codeExpiresAt: now + codeExpiresIn * 1000,
              resendAvailableAt: now + resendAvailableIn * 1000,
            }
          : prev
      );
      toast.success("We sent a new verification code");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Unable to resend verification code"
      );
      setAuthError(message);
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  }, [
    registrationContext,
    setAuthError,
    setRegistrationContext,
    setResendLoading,
    setSessionState,
  ]);

  /**
   * Finishes registration by validating the MFA code and creating the account.
   * @param {{code: string}} params
   */
  const handleRegisterVerify = useCallback(
    async ({ code }) => {
      if (!registrationContext?.verificationToken) {
        setAuthError("Registration session expired. Please start over.");
        setSessionState("register");
        return;
      }
      setAuthLoading(true);
      setAuthError("");
      try {
        const result = await registerVerify({
          code,
          token: registrationContext.verificationToken,
        });
        setRegistrationContext(null);
        if (result?.status === "pending") {
          applySessionUser(result);
          setSessionState("pending-approval");
          toast.success("Registration complete. Awaiting admin approval.");
          return;
        }
        applySessionUser(result);
        setSessionState("ready");
        toast.success("Account created! You're signed in.");
      } catch (error) {
        setAuthError(getErrorMessage(error, "Unable to verify code"));
      } finally {
        setAuthLoading(false);
      }
    },
    [
      registrationContext,
      applySessionUser,
      setAuthError,
      setAuthLoading,
      setRegistrationContext,
      setSessionState,
    ]
  );

  /**
   * Verifies the MFA challenge when logging in after the initial credentials step.
   * @param {{code: string}} params
   */
  const handleMfaSubmit = useCallback(
    async ({ code }) => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const response = await verifyMfa({ code });
        applySessionUser(response);
        setSessionState("ready");
        toast.success("Signed in successfully");
      } catch (error) {
        setAuthError(getErrorMessage(error, "Invalid authentication code"));
      } finally {
        setAuthLoading(false);
      }
    },
    [applySessionUser, setAuthError, setAuthLoading, setSessionState]
  );

  /**
   * Returns the UI to the username/password step from the MFA challenge.
   */
  const handleMfaBack = useCallback(() => {
    setAuthError("");
    setSessionState("login");
  }, [setAuthError, setSessionState]);

  /**
   * Ends the current session and communicates the outcome to the parent surface.
   */
  const handleLogout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.warn("Logout failed", error);
    } finally {
      if (onSessionReset) {
        onSessionReset();
      } else {
        handleSwitchToLogin();
      }
      toast.success("Signed out");
    }
  }, [handleSwitchToLogin, onSessionReset]);

  return {
    handleLoginSubmit,
    handleRegisterSubmit,
    handleEmailOtpSubmit,
    handleResendEmailOtp,
    handleRegisterVerify,
    handleMfaSubmit,
    handleMfaBack,
    handleLogout,
  };
};

export default useAuthFlow;
