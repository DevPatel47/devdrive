import ApiError from "../../utils/apiError.js";
import { ensureCodeProvided, sanitizeTotpCode } from "./helpers.js";
import { verifyTotpCode } from "./totpUtils.js";

export const verifyTotpForUser = async ({ user, code }) => {
  ensureCodeProvided(code, "One-time code is required");
  const sanitizedCode = sanitizeTotpCode(code);
  const validCode = verifyTotpCode(user.totpSecret, sanitizedCode);
  if (!validCode) {
    throw new ApiError(401, "Invalid authentication code");
  }
  if (!user.emailVerification?.verified) {
    throw new ApiError(400, "Email verification incomplete");
  }
  if (user.status !== "approved") {
    throw new ApiError(403, "Account pending approval");
  }
  return user;
};
