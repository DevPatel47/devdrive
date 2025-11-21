import express from "express";
import registerAppLoaders from "./loaders/express.js";

/**
 * Creates a new Express app instance with middleware and routes wired up.
 * @returns {import("express").Express}
 */
const createApp = () => {
  const app = express();
  registerAppLoaders(app);
  return app;
};

export default createApp;
