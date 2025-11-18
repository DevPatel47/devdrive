import User from "../models/User.js";
import ApiError from "../utils/apiError.js";
import config from "../config/env.js";
import {
  verifyAccessToken,
  getCookieNames,
} from "../services/sessionService.js";
import { buildUserRoot } from "../utils/userRoot.js";

const COOKIE_NAMES = getCookieNames();

export const requireAuth = async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAMES.access];
  if (!token) {
    return next(new ApiError(401, "Not authenticated"));
  }
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Session expired"
        : "Invalid session token";
    return next(new ApiError(401, message));
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return next(new ApiError(401, "Invalid session"));
  }
  if (user.status !== "approved") {
    return next(new ApiError(403, "Account pending approval"));
  }
  if (!user.rootPrefix) {
    user.rootPrefix = buildUserRoot(user.id);
    await user.save();
  }

  const desiredQuota = Number(config.storage.defaultUserQuotaBytes || 0);
  if (
    desiredQuota > 0 &&
    (!user.maxStorageBytes || user.maxStorageBytes < desiredQuota)
  ) {
    user.maxStorageBytes = desiredQuota;
    await user.save();
  }

  req.user = {
    id: user.id,
    username: user.username,
    rootPrefix: user.rootPrefix,
    role: user.role,
    status: user.status,
    maxStorageBytes: user.maxStorageBytes,
    emailVerified: Boolean(user.emailVerification?.verified),
  };
  return next();
};

export default {
  requireAuth,
};
