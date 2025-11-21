/**
 * Wraps an async Express handler to surface rejections via next().
 * @param {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<unknown>} handler
 */
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export default asyncHandler;
