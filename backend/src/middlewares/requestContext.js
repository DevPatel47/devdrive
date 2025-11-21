import { randomUUID } from "node:crypto";

/**
 * Ensures every request/response pair carries a stable request ID header.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const requestContext = (req, res, next) => {
  const headerId = req.headers["x-request-id"];
  const requestId = typeof headerId === "string" ? headerId : randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};

export default requestContext;
