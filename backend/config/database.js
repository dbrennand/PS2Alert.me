import mongoose from 'mongoose';

export default async () => {
    // Connect to the database
    try {
        await mongoose.connect('mongodb://db:27017/ps2-alert-notify', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB.')
    } catch (error) {
        // Log error and exit
        console.error(`Could not connect to MongoDB: ${error}`);
        process.exit(1);
    }
};
