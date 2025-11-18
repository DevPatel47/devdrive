import ApiError from "../utils/apiError.js";
import logger from "../config/logger.js";

export const errorHandler = (err, req, res, _next) => {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const code = isApiError ? err.code : "INTERNAL_SERVER_ERROR";
  const message = isApiError ? err.message : "Internal server error";
  if (!isApiError) {
    logger.error({ err, requestId: req.id }, "Unhandled error");
  } else {
    logger.debug({ err, requestId: req.id }, "Handled ApiError");
  }
  res.status(statusCode).json({
    error: {
      code,
      message,
      details: err.details,
      requestId: req.id,
    },
  });
};

export default {
  errorHandler,
};
