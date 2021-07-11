// Import required library
import mongoose from 'mongoose';

// Get database credentials
const dbUsername = process.env.DBUSERNAME;
const dbPassword = process.env.DBPASSWORD;

// Function to connect to MongoDB
export default async () => {
    // Connect to MongoDB
    try {
        await mongoose.connect(`mongodb://${dbUsername}:${dbPassword}@db:27017/PS2AlertMe`, {
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
