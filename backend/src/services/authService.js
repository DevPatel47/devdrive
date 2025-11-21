import * as authService from "./auth/index.js";

/** Proxy exports for the underlying auth service implementation. */
export const {
  initRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  verifyRegistration,
  validateLogin,
  verifyTotpForUser,
} = authService;

export default authService;
