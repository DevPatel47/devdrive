import ApiError from "../utils/apiError.js";

/**
 * Restricts access to routes that require admin-level privileges.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 */
export const requireAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Admin privileges required"));
  }
  return next();
};

export default {
  requireAdmin,
};
