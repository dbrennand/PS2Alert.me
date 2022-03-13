import mongoose from "mongoose";

// Define Schema for Notify model
const notifySchema = new mongoose.Schema({
  servers: {
    type: [String],
    // Connery, Miller, Cobalt, Emerald, SolTech
    enum: ["1", "10", "13", "17", "40"],
    required: [true, "Invalid server."],
  },
  subscription: {
    endpoint: { type: String, unique: true, required: true },
    // Firefox doesn't provide this but some browsers (such as Edge) do
    expirationTime: { type: Number, required: false },
    keys: {
      auth: { type: String, required: true },
      p256dh: { type: String, required: true },
    },
  },
});

export default mongoose.model("Notify", notifySchema);
