import User from "../models/User.js";
import ApiError from "../utils/apiError.js";
import {
  createPendingLogin,
  clearPendingLogin,
  issueSessionCookies,
  handleRefresh,
  clearSessionCookies,
  revokeFromCookie,
  verifyPendingToken,
  getCookieNames,
} from "../services/sessionService.js";
import {
  initRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  verifyRegistration,
  validateLogin,
  verifyTotpForUser,
} from "../services/authService.js";
import { notifyAdminsOfPendingUser } from "../services/emailService.js";

const COOKIE_NAMES = getCookieNames();

const buildSessionMetadata = (user) => ({
  username: user.username,
  role: user.role,
  status: user.status,
  maxStorageBytes: user.maxStorageBytes,
  emailVerified: Boolean(user.emailVerification?.verified),
});

export const registerInit = async (req, res) => {
  const { username, password } = req.body || {};
  const result = await initRegistration({ username, password });
  res.json(result);
};

export const registerVerifyEmail = async (req, res) => {
  const { token, code } = req.body || {};
  const { user, qrCodeDataUrl, otpauthUrl, secret, verificationToken } =
    await verifyEmailOtp({ token, code });

  res.json({
    status: "email_verified",
    username: user.username,
    qrCodeDataUrl,
    otpauthUrl,
    secret,
    verificationToken,
    emailVerified: true,
  });
};

export const registerResendEmail = async (req, res) => {
  const { token } = req.body || {};
  const result = await resendEmailOtp({ token });
  res.json(result);
};

export const registerVerify = async (req, res) => {
  const { token, code } = req.body || {};
  const user = await verifyRegistration({ token, code });
  if (user.status !== "approved") {
    await notifyAdminsOfPendingUser({ username: user.username });
    return res.json({
      status: "pending",
      username: user.username,
      role: user.role,
      maxStorageBytes: user.maxStorageBytes,
      emailVerified: true,
    });
  }

  const session = issueSessionCookies(res, user.id, buildSessionMetadata(user));
  clearPendingLogin(res);
  res.json({ status: "registered", username: user.username, ...session });
};

export const login = async (req, res) => {
  const { username, password } = req.body || {};
  const user = await validateLogin({ username, password });
  createPendingLogin(res, user.id);
  res.json({ next: "mfa" });
};

export const verifyMfa = async (req, res) => {
  const { code } = req.body || {};
  const pendingToken = req.cookies?.[COOKIE_NAMES.pending];
  if (!pendingToken) {
    throw new ApiError(401, "Login expired. Please try again.");
  }

  let payload;
  try {
    payload = verifyPendingToken(pendingToken);
  } catch (_error) {
    throw new ApiError(401, "Login expired. Please try again.");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, "Login expired. Please try again.");
  }

  await verifyTotpForUser({ user, code });
  clearPendingLogin(res);
  const session = issueSessionCookies(res, user.id, buildSessionMetadata(user));
  res.json({ status: "authenticated", username: user.username, ...session });
};

export const refreshSession = async (req, res) => {
  const refreshToken = req.cookies?.[COOKIE_NAMES.refresh];
  const { userId, expiresIn } = handleRefresh(res, refreshToken);
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, "Invalid session");
  }
  if (user.status !== "approved") {
    throw new ApiError(403, "Account pending approval");
  }
  res.json({
    status: "refreshed",
    ...buildSessionMetadata(user),
    expiresIn,
  });
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies?.[COOKIE_NAMES.refresh];
  revokeFromCookie(refreshToken);
  clearSessionCookies(res);
  res.json({ success: true });
};

export const currentUser = async (req, res) => {
  res.json({ ...req.user });
};

export default {
  registerInit,
  registerVerifyEmail,
  registerResendEmail,
  registerVerify,
  login,
  verifyMfa,
  refreshSession,
  logout,
  currentUser,
};
