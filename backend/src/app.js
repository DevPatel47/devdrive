import express from "express";
import registerAppLoaders from "./loaders/express.js";

const createApp = () => {
  const app = express();
  registerAppLoaders(app);
  return app;
};

export default createApp;
