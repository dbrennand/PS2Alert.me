// Import required library
import mongoose from 'mongoose';

// Get MongoDB connection URI
const connectionUri = process.env.MONGO_CONNECTION_URI;

// Function to connect to MongoDB
export default async () => {
    // Connect to MongoDB
    try {
        await mongoose.connect(connectionUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });
        console.log('Connected to MongoDB.')
    } catch (error) {
        // Log error and exit
        console.error(`An error occurred when connecting to MongoDB: ${error}`);
        process.exit(1);
    }
};
