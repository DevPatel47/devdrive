import * as authService from "./auth/index.js";

export const {
  initRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  verifyRegistration,
  validateLogin,
  verifyTotpForUser,
} = authService;

export default authService;
