import startServer from "./src/server.js";
import logger from "./src/config/logger.js";

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});
