import api from "./client";

/**
 * Exchanges username/password for a pending MFA session.
 * @param {{ username: string, password: string }} credentials
 */
export const login = async ({ username, password }) => {
  const { data } = await api.post("/auth/login", { username, password });
  return data;
};

/**
 * Begins registration by validating credentials and sending an OTP.
 */
export const registerInit = async ({ username, password }) => {
  const { data } = await api.post("/auth/register/init", {
    username,
    password,
  });
  return data;
};

/**
 * Confirms the email verification code.
 */
export const verifyEmailOtp = async ({ code, token }) => {
  const { data } = await api.post("/auth/register/email-verify", {
    code,
    token,
  });
  return data;
};

/**
 * Re-sends the email OTP if possible.
 */
export const resendEmailOtp = async ({ token }) => {
  const { data } = await api.post("/auth/register/resend-email", { token });
  return data;
};

/**
 * Completes registration by validating the MFA code.
 */
export const registerVerify = async ({ code, token }) => {
  const { data } = await api.post("/auth/register/verify", { code, token });
  return data;
};

/**
 * Validates a login MFA code.
 */
export const verifyMfa = async ({ code }) => {
  const { data } = await api.post("/auth/mfa", { code });
  return data;
};

/** Fetches the authenticated user's session metadata. */
export const fetchSession = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

/** Ends the current session and clears cookies. */
export const logout = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};
