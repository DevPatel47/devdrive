import {
  initRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  verifyRegistration,
} from "./registrationService.js";
import { validateLogin } from "./loginService.js";
import { verifyTotpForUser } from "./totpService.js";

/** Re-export granular auth services for easier importing. */
export {
  initRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  verifyRegistration,
  validateLogin,
  verifyTotpForUser,
};
