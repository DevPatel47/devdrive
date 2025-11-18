import ApiError from "../utils/apiError.js";

export const requireAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Admin privileges required"));
  }
  return next();
};

export default {
  requireAdmin,
};
