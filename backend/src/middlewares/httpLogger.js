import pinoHttp from "pino-http";
import logger from "../config/logger.js";

/**
 * Request-scoped logger middleware that injects request IDs into logs.
 * @type {import("pino-http").HttpLogger}
 */
const httpLogger = pinoHttp({
  logger,
  customProps: (req) => ({ requestId: req.id }),
});

export default httpLogger;
