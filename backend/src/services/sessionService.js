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

/**
 * Central helper for writing HTTP-only session cookies.
 * @param {import("express").Response} res
 * @param {string} name
 * @param {string} value
 * @param {number} ttlSeconds
 */
const setCookieToken = (res, name, value, ttlSeconds) => {
  res.cookie(name, value, {
    ...cookieBaseOptions,
    maxAge: ttlSeconds * 1000,
  });
};

/**
 * Removes a cookie using the shared base options.
 * @param {import("express").Response} res
 * @param {string} name
 */
const clearCookie = (res, name) => {
  res.clearCookie(name, cookieBaseOptions);
};

/**
 * Purges expired refresh tokens from the in-memory store.
 */
const cleanupRefreshTokens = () => {
  const now = Date.now();
  for (const [jti, entry] of refreshTokenStore.entries()) {
    if (!entry || entry.expiresAt <= now) {
      refreshTokenStore.delete(jti);
    }
  }
};

setInterval(cleanupRefreshTokens, 60 * 60 * 1000).unref?.();

/**
 * Issues a signed JWT for access/refresh/pending flows.
 * @param {{ type: string, subject: string, ttl: number }} options
 * @returns {{ token: string, jti: string }}
 */
const createToken = ({ type, subject, ttl }) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ type }, config.session.secret, {
    subject,
    expiresIn: ttl,
    jwtid: jti,
  });
  return { token, jti };
};

/**
 * Validates a JWT and ensures it matches the expected token type.
 * @param {string} token
 * @param {string} expectedType
 */
const verifyToken = (token, expectedType) => {
  const payload = jwt.verify(token, config.session.secret);
  if (payload.type !== expectedType) {
    throw new ApiError(401, "Invalid token type");
  }
  return payload;
};

/**
 * Persists refresh token identifiers so they can be revoked later.
 * @param {string} jti
 * @param {string} subject
 */
const registerRefreshToken = (jti, subject) => {
  cleanupRefreshTokens();
  refreshTokenStore.set(jti, {
    subject,
    expiresAt: Date.now() + config.session.refreshTtl * 1000,
  });
};

/**
 * Ensures a refresh token is still active before issuing new cookies.
 * @param {string} jti
 */
const assertRefreshTokenActive = (jti) => {
  const entry = refreshTokenStore.get(jti);
  if (!entry || entry.expiresAt <= Date.now()) {
    refreshTokenStore.delete(jti);
    throw new ApiError(401, "Session expired");
  }
  return entry;
};

/**
 * Deletes a refresh token from the store.
 * @param {string | undefined} jti
 */
const revokeRefreshToken = (jti) => {
  if (jti) {
    refreshTokenStore.delete(jti);
  }
};

/**
 * Generates new access/refresh cookies for a subject.
 * @param {import("express").Response} res
 * @param {string} subject
 * @param {object} [metadata]
 */
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

/**
 * Issues a short-lived pending-token cookie used during MFA.
 * @param {import("express").Response} res
 * @param {string} subject
 */
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

/**
 * Removes the pending login cookie.
 * @param {import("express").Response} res
 */
export const clearPendingLogin = (res) => {
  clearCookie(res, COOKIE_NAMES.pending);
};

/**
 * Removes every session-related cookie value.
 * @param {import("express").Response} res
 */
export const clearSessionCookies = (res) => {
  Object.values(COOKIE_NAMES).forEach((name) => clearCookie(res, name));
};

export const verifyPendingToken = (token) => verifyToken(token, "pending");
export const verifyAccessToken = (token) => verifyToken(token, "access");
export const verifyRefreshToken = (token) => verifyToken(token, "refresh");

/**
 * Validates a refresh cookie, rotates it, and returns new access metadata.
 * @param {import("express").Response} res
 * @param {string | undefined} refreshToken
 */
export const handleRefresh = (res, refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Not authenticated");
  }
  const payload = verifyRefreshToken(refreshToken);
  assertRefreshTokenActive(payload.jti);
  revokeRefreshToken(payload.jti);
  return issueSessionCookies(res, payload.sub);
};

/**
 * Revokes the refresh token referenced by the cookie without throwing on errors.
 * @param {string | undefined} refreshToken
 */
export const revokeFromCookie = (refreshToken) => {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    revokeRefreshToken(payload.jti);
  } catch (_error) {
    // ignore
  }
};

/**
 * Exposes the canonical cookie names for downstream modules.
 * @returns {{ access: string, refresh: string, pending: string }}
 */
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
