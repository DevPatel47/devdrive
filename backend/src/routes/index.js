import authRoutes from "./authRoutes.js";
import fileRoutes from "./fileRoutes.js";
import healthRoutes from "./healthRoutes.js";
import adminRoutes from "./adminRoutes.js";

const registerRoutes = (app) => {
  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);
  app.use(fileRoutes);
  app.use("/health", healthRoutes);
};

export default registerRoutes;
