import bcrypt from "bcryptjs";
import config from "../../config/env.js";
import ApiError from "../../utils/apiError.js";
import User from "../../models/User.js";
import { buildUserRoot } from "../../utils/userRoot.js";
import { ensureFolderExists } from "../s3Service.js";
import {
  normalizeEmail,
  validateCredentials,
  validateEmail,
  RESEND_COOLDOWN_MS,
  ensureCodeProvided,
  sanitizeTotpCode,
} from "./helpers.js";
import { buildTotpArtifacts, verifyTotpCode } from "./totpUtils.js";
import {
  createEmailVerificationToken,
  createRegistrationToken,
  decodeEmailVerificationToken,
  decodeRegistrationToken,
} from "./tokenFactory.js";
import { prepareEmailVerificationSession } from "./emailVerificationSession.js";

const cleanupUnverifiedUser = async (user) => {
  if (user && !user.emailVerification?.verified) {
    await User.deleteOne({ _id: user._id });
    return null;
  }
  return user;
};

const ensureUserApprovedOrPending = (user) => {
  if (user && user.mfaVerified) {
    throw new ApiError(409, "Username is already in use");
  }
};

const autoApproveIfNeeded = (user) => {
  const autoApprove = config.admin.autoApproveUsernames.includes(
    user.usernameLower
  );
  if (autoApprove) {
    user.role = "admin";
    user.status = "approved";
    user.approvedAt = new Date();
    user.approvedBy = user._id;
  }
};

export const initRegistration = async ({ username, password }) => {
  const email = validateEmail(username);
  validateCredentials({ email, password });
  const usernameLower = normalizeEmail(email);

  let user = await User.findOne({ usernameLower });
  ensureUserApprovedOrPending(user);
  user = await cleanupUnverifiedUser(user);

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
  ensureCodeProvided(code);

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
  ensureUserApprovedOrPending(user);
  user = await cleanupUnverifiedUser(user);

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
  await cleanupUnverifiedUser(existingUser);

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
  ensureCodeProvided(code, "Verification code is required");

  const payload = decodeRegistrationToken(token, "Registration");

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(404, "Registration not found");
  }
  if (!user.emailVerification?.verified) {
    throw new ApiError(400, "Email verification is required before MFA");
  }

  const sanitizedCode = sanitizeTotpCode(code);
  const validCode = verifyTotpCode(user.totpSecret, sanitizedCode);

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
