import startServer from "./src/server.js";
import logger from "./src/config/logger.js";

/**
 * Bootstraps the HTTP server and exits if startup fails.
 */
startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});
