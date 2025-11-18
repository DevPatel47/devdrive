import { randomUUID } from "node:crypto";

export const requestContext = (req, res, next) => {
  const headerId = req.headers["x-request-id"];
  const requestId = typeof headerId === "string" ? headerId : randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};

export default requestContext;
