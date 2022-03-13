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
    .catch((err) => {
      logger.error(JSON.stringify(err), "Failed to connect to MongoDB.");
      process.exit(1);
    });
};
