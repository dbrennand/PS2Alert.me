import mongoose from 'mongoose';

// Define Schema for notify model

const notifySchema = new mongoose.Schema({
    servers: [String],
    subscription: {
        endpoint: { type: String, unique: true, required: true },
        // Firefox doesn't provide this but some browsers (such as Edge) do
        expirationTime: { type: Number, required: false },
        keys: {
            auth: String,
            p256dh: String
        }
    }
});

export default mongoose.model('Notify', notifySchema);
