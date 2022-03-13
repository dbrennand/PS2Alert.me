import mongoose from "mongoose";
import logger from "./logger.mjs";

const connectionUri = process.env.MONGODB_CONNECTION_URI;

// Connect to MongoDB
export default async () => {
  await mongoose
    .connect(connectionUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      // https://mongoosejs.com/docs/5.x/docs/deprecations.html#findandmodify
      useFindAndModify: false,
    })
    .then(logger.info("Connected to MongoDB."))
    .catch((error) => {
      logger.error(`Failed to connect to MongoDB: ${error}`);
      process.exit(1);
    });
};
