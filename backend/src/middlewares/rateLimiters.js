import rateLimit from "express-rate-limit";

/**
 * Baseline rate limiter for all endpoints.
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/**
 * Stricter rate limiter applied to authentication endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: "Too many authentication attempts. Please try again shortly.",
});

export default {
  globalLimiter,
  authLimiter,
};
