import config from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import createApp from "./app.js";
import logger from "./config/logger.js";

export const startServer = async () => {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, "DevDrive backend listening");
  });
  return server;
};

export default startServer;
