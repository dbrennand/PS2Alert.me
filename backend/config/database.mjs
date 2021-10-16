// Import required library
import mongoose from 'mongoose';
// Custom import
import logger from './logger.mjs';

// Get MongoDB connection URI
const connectionUri = process.env.MONGO_CONNECTION_URI;

// Export function to connect to MongoDB
export default async () => {
    // Connect to MongoDB
    try {
        await mongoose.connect(connectionUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            // https://mongoosejs.com/docs/5.x/docs/deprecations.html#findandmodify
            useFindAndModify: false
        });
        logger.info('Connected to MongoDB.');
    } catch (error) {
        // Log error and exit
        logger.error(`Failed to connect to MongoDB: ${error}`);
        process.exit(1);
    }
};
