import jwt from "jsonwebtoken";
import config from "../../config/env.js";
import ApiError from "../../utils/apiError.js";
import { REGISTRATION_TTL_SECONDS } from "./helpers.js";

/**
 * Generates a signed registration token payload.
 * @param {object} payload
 * @param {number} expiresIn
 */
const createToken = (payload, expiresIn) =>
  jwt.sign(payload, config.session.secret, { expiresIn });

/**
 * Issues a token that references a partially registered user.
 * @param {string} userId
 */
export const createRegistrationToken = (userId) =>
  createToken({ type: "register", sub: userId }, REGISTRATION_TTL_SECONDS);

/**
 * Issues a token that stores email verification state between steps.
 * @param {object} payload
 */
export const createEmailVerificationToken = (payload) =>
  createToken({ type: "register_email", ...payload }, REGISTRATION_TTL_SECONDS);

/**
 * Verifies a registration token and ensures it is the expected type.
 * @param {string} token
 * @param {string} [context]
 */
export const decodeRegistrationToken = (token, context = "Verification") => {
  if (!token) {
    throw new ApiError(400, `${context} token is required`);
  }

  try {
    const payload = jwt.verify(token, config.session.secret);
    if (payload.type !== "register") {
      throw new ApiError(400, `Invalid ${context.toLowerCase()} token type`);
    }
    return payload;
  } catch (_error) {
    throw new ApiError(400, `${context} token is invalid or expired`);
  }
};

/**
 * Verifies an email verification token and returns the payload.
 * @param {string} token
 */
export const decodeEmailVerificationToken = (token) => {
  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  try {
    const payload = jwt.verify(token, config.session.secret);
    if (payload.type !== "register_email") {
      throw new ApiError(400, "Invalid verification token type");
    }
    return payload;
  } catch (_error) {
    throw new ApiError(400, "Verification token is invalid or expired");
  }
};
