import bcrypt from "bcryptjs";
import ApiError from "../../utils/apiError.js";
import User from "../../models/User.js";
import { normalizeEmail, validateCredentials } from "./helpers.js";

/**
 * Confirms a username/password pair and enforces verification status.
 * @param {{ username: string, password: string }} payload
 * @returns {Promise<import("../../models/User.js").default>}
 */
export const validateLogin = async ({ username, password }) => {
  validateCredentials({ email: username, password });
  const usernameLower = normalizeEmail(username);
  const user = await User.findOne({ usernameLower });
  if (!user || !user.mfaVerified) {
    throw new ApiError(401, "Invalid credentials");
  }
  if (!user.emailVerification?.verified) {
    throw new ApiError(400, "Email verification incomplete");
  }
  if (user.status !== "approved") {
    throw new ApiError(403, "Account pending approval");
  }
  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  return user;
};
