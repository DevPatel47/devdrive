import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import config from "../config/env.js";
import ApiError from "../utils/apiError.js";
import User from "../models/User.js";
import { buildUserRoot } from "../utils/userRoot.js";
import { ensureFolderExists } from "./s3Service.js";
import { sendEmailVerificationCode } from "./emailService.js";

const REGISTRATION_TTL_SECONDS = 15 * 60;
const OTP_EXPIRATION_MS = 2 * 60 * 1000;
const RESEND_COOLDOWN_MS = 90 * 1000;

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const sanitizeEmail = (value = "") => value.trim();
const normalizeEmail = (value = "") => sanitizeEmail(value).toLowerCase();

const validateEmail = (email = "") => {
  const sanitized = sanitizeEmail(email);
  if (!sanitized || !emailRegex.test(sanitized)) {
    throw new ApiError(400, "A valid email address is required");
  }
  return sanitized;
};

const validateCredentials = ({ email, password }) => {
  validateEmail(email);
  if (!password || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }
};

const generateTotpSecret = (username) =>
  speakeasy.generateSecret({
    name: `${config.auth.issuer} (${username})`,
    length: 32,
  });

const createRegistrationToken = (userId) =>
  jwt.sign({ type: "register", sub: userId }, config.session.secret, {
    expiresIn: REGISTRATION_TTL_SECONDS,
  });

const createEmailVerificationToken = (payload) =>
  jwt.sign({ type: "register_email", ...payload }, config.session.secret, {
    expiresIn: REGISTRATION_TTL_SECONDS,
  });

const generateEmailOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const ensureTotpSecret = (user) => {
  if (!user.totpSecret) {
    const secret = generateTotpSecret(user.username);
    user.totpSecret = secret.base32;
  }
};

const buildTotpArtifacts = async (user) => {
  ensureTotpSecret(user);
  const otpauthUrl = speakeasy.otpauthURL({
    secret: user.totpSecret,
    label: `${config.auth.issuer} (${user.username})`,
    issuer: config.auth.issuer,
    encoding: "base32",
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1 });
  return {
    secret: user.totpSecret,
    otpauthUrl,
    qrCodeDataUrl,
  };
};

const decodeRegistrationToken = (token, context = "Verification") => {
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
const decodeEmailVerificationToken = (token) => {
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

const prepareEmailVerificationSession = async ({ email }) => {
  const otpCode = generateEmailOtp();
  const otpHash = await bcrypt.hash(otpCode, 8);
  const now = Date.now();
  await sendEmailVerificationCode({
    username: email,
    email,
    code: otpCode,
  });
  return {
    otp: {
      code: otpHash,
      expiresAt: now + OTP_EXPIRATION_MS,
      sentAt: now,
    },
    codeExpiresIn: Math.floor(OTP_EXPIRATION_MS / 1000),
    resendAvailableIn: Math.floor(RESEND_COOLDOWN_MS / 1000),
  };
};

export const initRegistration = async ({ username, password }) => {
  const email = validateEmail(username);
  validateCredentials({ email, password });
  const usernameLower = normalizeEmail(email);

  let user = await User.findOne({ usernameLower });

  if (user && user.mfaVerified) {
    throw new ApiError(409, "Username is already in use");
  }

  if (user && !user.emailVerification?.verified) {
    await User.deleteOne({ _id: user._id });
    user = null;
  }

  if (user && user.emailVerification?.verified) {
    const artifacts = await buildTotpArtifacts(user);
    await user.save();
    return {
      status: "email_verified",
      email: user.username,
      qrCodeDataUrl: artifacts.qrCodeDataUrl,
      otpauthUrl: artifacts.otpauthUrl,
      secret: artifacts.secret,
      verificationToken: createRegistrationToken(user.id),
      emailVerified: true,
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { otp, codeExpiresIn, resendAvailableIn } =
    await prepareEmailVerificationSession({ email });

  const verificationToken = createEmailVerificationToken({
    email,
    usernameLower,
    passwordHash,
    otp,
  });

  return {
    status: "email_verification_required",
    verificationToken,
    email,
    codeExpiresIn,
    resendAvailableIn,
  };
};

export const verifyEmailOtp = async ({ token, code }) => {
  if (!code) {
    throw new ApiError(400, "Verification code is required");
  }

  const payload = decodeEmailVerificationToken(token);
  const verification = payload.otp || {};

  if (!verification.code || !verification.expiresAt) {
    throw new ApiError(
      400,
      "No verification code found. Please restart registration."
    );
  }
  if (verification.expiresAt < Date.now()) {
    throw new ApiError(
      400,
      "Verification code expired. Please request a new one."
    );
  }

  const sanitizedCode = String(code).trim();
  const valid = await bcrypt.compare(sanitizedCode, verification.code);
  if (!valid) {
    throw new ApiError(401, "Invalid verification code");
  }

  let user = await User.findOne({ usernameLower: payload.usernameLower });
  if (user && user.mfaVerified) {
    throw new ApiError(409, "Username is already in use");
  }

  if (user && !user.emailVerification?.verified) {
    await User.deleteOne({ _id: user._id });
    user = null;
  }

  if (!user) {
    const autoApprove = config.admin.autoApproveUsernames.includes(
      payload.usernameLower
    );
    user = new User({
      username: payload.email,
      usernameLower: payload.usernameLower,
      passwordHash: payload.passwordHash,
      role: autoApprove ? "admin" : "user",
      status: autoApprove ? "approved" : "pending",
      maxStorageBytes: config.storage.defaultUserQuotaBytes,
      emailVerification: { verified: true },
    });
    if (autoApprove) {
      user.approvedAt = new Date();
      user.approvedBy = user._id;
    }
    await user.save();
  } else if (!user.emailVerification?.verified) {
    user.emailVerification = { verified: true };
    await user.save();
  }

  const artifacts = await buildTotpArtifacts(user);
  await user.save();

  return {
    user,
    ...artifacts,
    verificationToken: createRegistrationToken(user.id),
  };
};

export const resendEmailOtp = async ({ token }) => {
  const payload = decodeEmailVerificationToken(token);

  const existingUser = await User.findOne({
    usernameLower: payload.usernameLower,
  });
  if (existingUser?.emailVerification?.verified) {
    throw new ApiError(400, "Email address is already verified");
  }
  if (existingUser && !existingUser.emailVerification?.verified) {
    await User.deleteOne({ _id: existingUser._id });
  }

  const lastSentAt = payload.otp?.sentAt || null;
  if (lastSentAt) {
    const elapsed = Date.now() - lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new ApiError(
        429,
        `Please wait ${waitSeconds}s before requesting another code.`
      );
    }
  }

  const { otp, codeExpiresIn, resendAvailableIn } =
    await prepareEmailVerificationSession({ email: payload.email });

  const verificationToken = createEmailVerificationToken({
    email: payload.email,
    usernameLower: payload.usernameLower,
    passwordHash: payload.passwordHash,
    otp,
  });

  return {
    status: "email_verification_required",
    verificationToken,
    email: payload.email,
    codeExpiresIn,
    resendAvailableIn,
  };
};

export const verifyRegistration = async ({ token, code }) => {
  if (!code) {
    throw new ApiError(400, "Verification code is required");
  }

  const payload = decodeRegistrationToken(token, "Registration");

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(404, "Registration not found");
  }
  if (!user.emailVerification?.verified) {
    throw new ApiError(400, "Email verification is required before MFA");
  }

  const sanitizedCode = String(code).replace(/\s+/g, "");
  const validCode = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: sanitizedCode,
    window: 1,
  });

  if (!validCode) {
    throw new ApiError(401, "Invalid authentication code");
  }

  user.mfaVerified = true;
  if (!user.rootPrefix) {
    user.rootPrefix = buildUserRoot(user._id.toString());
  }
  await user.save();
  await ensureFolderExists(user.rootPrefix);

  return user;
};

export const validateLogin = async ({ username, password }) => {
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }
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

export const verifyTotpForUser = async ({ user, code }) => {
  if (!code) {
    throw new ApiError(400, "One-time code is required");
  }
  const sanitizedCode = String(code).replace(/\s+/g, "");
  const validCode = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: sanitizedCode,
    window: 1,
  });
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

export default {
  initRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  verifyRegistration,
  validateLogin,
  verifyTotpForUser,
};
