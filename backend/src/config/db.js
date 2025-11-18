import mongoose from "mongoose";
import config from "./env.js";
import logger from "./logger.js";

export const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info("MongoDB connection established");
  } catch (error) {
    logger.fatal({ err: error }, "Failed to connect to MongoDB");
    process.exit(1);
  }
};

export default mongoose;
