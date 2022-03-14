import mongoose from "mongoose";
import logger from "./logger.mjs";

const connectionUri = process.env.MONGODB_CONNECTION_URI;

// Connect to MongoDB
export default async () => {
  await mongoose
    .connect(connectionUri)
    .then(() => {
      logger.info("Connected to MongoDB.");
    })
    .catch((err) => {
      logger.error(`Failed to connect to MongoDB: ${err}`);
      process.exit(1);
    });
};
