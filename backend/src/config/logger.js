import pino from "pino";
import config from "./env.js";

const isProduction = config.env === "production";

const logger = pino({
  level: config.log.level,
  base: { service: "devdrive-backend" },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
});

export default logger;
