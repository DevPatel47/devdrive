import ApiError from "../../utils/apiError.js";

export const REGISTRATION_TTL_SECONDS = 15 * 60;
export const OTP_EXPIRATION_MS = 2 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 90 * 1000;

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const sanitizeEmail = (value = "") => value.trim();

export const normalizeEmail = (value = "") =>
  sanitizeEmail(value).toLowerCase();

export const validateEmail = (email = "") => {
  const sanitized = sanitizeEmail(email);
  if (!sanitized || !emailRegex.test(sanitized)) {
    throw new ApiError(400, "A valid email address is required");
  }
  return sanitized;
};

export const validateCredentials = ({ email, password }) => {
  validateEmail(email);
  if (!password || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }
};

export const ensureCodeProvided = (
  code,
  message = "Verification code is required"
) => {
  if (!code) {
    throw new ApiError(400, message);
  }
};

export const sanitizeTotpCode = (code) =>
  String(code ?? "").replace(/\s+/g, "");

export const generateEmailOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
