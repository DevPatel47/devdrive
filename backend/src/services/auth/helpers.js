import ApiError from "../../utils/apiError.js";

export const REGISTRATION_TTL_SECONDS = 15 * 60;
export const OTP_EXPIRATION_MS = 2 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 90 * 1000;

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * Trims whitespace from a raw email string.
 * @param {string} [value]
 */
export const sanitizeEmail = (value = "") => value.trim();

/**
 * Lowercases a sanitized email for uniqueness checks.
 * @param {string} [value]
 */
export const normalizeEmail = (value = "") =>
  sanitizeEmail(value).toLowerCase();

/**
 * Validates the format of an email address and returns the sanitized value.
 * @param {string} [email]
 */
export const validateEmail = (email = "") => {
  const sanitized = sanitizeEmail(email);
  if (!sanitized || !emailRegex.test(sanitized)) {
    throw new ApiError(400, "A valid email address is required");
  }
  return sanitized;
};

/**
 * Ensures both email and password meet baseline requirements.
 * @param {{ email: string, password: string }} payload
 */
export const validateCredentials = ({ email, password }) => {
  validateEmail(email);
  if (!password || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }
};

/**
 * Asserts a verification code exists before attempting validation.
 * @param {string | number | undefined} code
 * @param {string} [message]
 */
export const ensureCodeProvided = (
  code,
  message = "Verification code is required"
) => {
  if (!code) {
    throw new ApiError(400, message);
  }
};

/**
 * Removes whitespace from TOTP input.
 * @param {string | number} code
 */
export const sanitizeTotpCode = (code) =>
  String(code ?? "").replace(/\s+/g, "");

/**
 * Produces a six-digit OTP string.
 */
export const generateEmailOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
