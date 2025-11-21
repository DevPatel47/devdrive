/**
 * Base error for consistent API responses.
 */
class ApiError extends Error {
  constructor(statusCode, message, { code = "API_ERROR", details } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export default ApiError;
