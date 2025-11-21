import config from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import createApp from "./app.js";
import logger from "./config/logger.js";

/**
 * Connects supporting services and starts the HTTP server.
 * @returns {Promise<import("http").Server>}
 */
export const startServer = async () => {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "DevDrive backend listening");
  });
  return server;
};

export default startServer;
