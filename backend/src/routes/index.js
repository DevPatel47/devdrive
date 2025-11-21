import authRoutes from "./authRoutes.js";
import fileRoutes from "./fileRoutes.js";
import healthRoutes from "./healthRoutes.js";
import adminRoutes from "./adminRoutes.js";

/**
 * Wires all HTTP routes into the provided Express app.
 * @param {import("express").Express} app
 */
const registerRoutes = (app) => {
  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);
  app.use(fileRoutes);
  app.use("/health", healthRoutes);
};

export default registerRoutes;
