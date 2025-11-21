import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import config from "../config/env.js";
import registerRoutes from "../routes/index.js";
import { globalLimiter } from "../middlewares/rateLimiters.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import requestContext from "../middlewares/requestContext.js";
import httpLogger from "../middlewares/httpLogger.js";

const corsOptions = {
  origin: config.frontendOrigin,
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
};

/**
 * Applies middleware, CORS, and routes to an Express application instance.
 * @param {import("express").Express} app
 */
export const registerAppLoaders = (app) => {
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(requestContext);
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(globalLimiter);

  registerRoutes(app);

  app.use(errorHandler);
};

export default registerAppLoaders;
