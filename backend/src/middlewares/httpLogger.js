import pinoHttp from "pino-http";
import logger from "../config/logger.js";

const httpLogger = pinoHttp({
  logger,
  customProps: (req) => ({ requestId: req.id }),
});

export default httpLogger;
