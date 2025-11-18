import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import ApiError from "../utils/apiError.js";

const COOKIE_NAMES = {
  access: "dd_access",
  refresh: "dd_refresh",
  pending: "dd_pending",
};

const refreshTokenStore = new Map();
const PENDING_TTL = 300;

const cookieBaseOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: config.session.secureCookies,
  path: "/",
};

const setCookieToken = (res, name, value, ttlSeconds) => {
  res.cookie(name, value, {
    ...cookieBaseOptions,
    maxAge: ttlSeconds * 1000,
  });
};

const clearCookie = (res, name) => {
  res.clearCookie(name, cookieBaseOptions);
};

const cleanupRefreshTokens = () => {
  const now = Date.now();
  for (const [jti, entry] of refreshTokenStore.entries()) {
    if (!entry || entry.expiresAt <= now) {
      refreshTokenStore.delete(jti);
    }
  }
};

setInterval(cleanupRefreshTokens, 60 * 60 * 1000).unref?.();

const createToken = ({ type, subject, ttl }) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ type }, config.session.secret, {
    subject,
    expiresIn: ttl,
    jwtid: jti,
  });
  return { token, jti };
};

const verifyToken = (token, expectedType) => {
  const payload = jwt.verify(token, config.session.secret);
  if (payload.type !== expectedType) {
    throw new ApiError(401, "Invalid token type");
  }
  return payload;
};

const registerRefreshToken = (jti, subject) => {
  cleanupRefreshTokens();
  refreshTokenStore.set(jti, {
    subject,
    expiresAt: Date.now() + config.session.refreshTtl * 1000,
  });
};

const assertRefreshTokenActive = (jti) => {
  const entry = refreshTokenStore.get(jti);
  if (!entry || entry.expiresAt <= Date.now()) {
    refreshTokenStore.delete(jti);
    throw new ApiError(401, "Session expired");
  }
  return entry;
};

const revokeRefreshToken = (jti) => {
  if (jti) {
    refreshTokenStore.delete(jti);
  }
};

export const issueSessionCookies = (res, subject, metadata = {}) => {
  const access = createToken({
    type: "access",
    subject,
    ttl: config.session.accessTtl,
  });
  setCookieToken(
    res,
    COOKIE_NAMES.access,
    access.token,
    config.session.accessTtl
  );

  const refresh = createToken({
    type: "refresh",
    subject,
    ttl: config.session.refreshTtl,
  });
  setCookieToken(
    res,
    COOKIE_NAMES.refresh,
    refresh.token,
    config.session.refreshTtl
  );
  registerRefreshToken(refresh.jti, subject);

  return {
    userId: subject,
    expiresIn: config.session.accessTtl,
    ...metadata,
  };
};

export const createPendingLogin = (res, subject) => {
  const pending = createToken({
    type: "pending",
    subject,
    ttl: PENDING_TTL,
  });
  setCookieToken(res, COOKIE_NAMES.pending, pending.token, PENDING_TTL);
  clearCookie(res, COOKIE_NAMES.access);
  clearCookie(res, COOKIE_NAMES.refresh);
  return pending;
};

export const clearPendingLogin = (res) => {
  clearCookie(res, COOKIE_NAMES.pending);
};

export const clearSessionCookies = (res) => {
  Object.values(COOKIE_NAMES).forEach((name) => clearCookie(res, name));
};

export const verifyPendingToken = (token) => verifyToken(token, "pending");
export const verifyAccessToken = (token) => verifyToken(token, "access");
export const verifyRefreshToken = (token) => verifyToken(token, "refresh");

export const handleRefresh = (res, refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Not authenticated");
  }
  const payload = verifyRefreshToken(refreshToken);
  assertRefreshTokenActive(payload.jti);
  revokeRefreshToken(payload.jti);
  return issueSessionCookies(res, payload.sub);
};

export const revokeFromCookie = (refreshToken) => {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    revokeRefreshToken(payload.jti);
  } catch (_error) {
    // ignore
  }
};

export const getCookieNames = () => COOKIE_NAMES;

export default {
  issueSessionCookies,
  createPendingLogin,
  clearPendingLogin,
  clearSessionCookies,
  verifyPendingToken,
  verifyAccessToken,
  verifyRefreshToken,
  handleRefresh,
  revokeFromCookie,
  getCookieNames,
};
