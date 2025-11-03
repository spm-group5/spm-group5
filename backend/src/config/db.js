import mongoose from 'mongoose'; //for MongoDB connection
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables if not already loaded
if (!process.env.MONGO_URI) {
    // Set NODE_ENV to 'test' if not already set
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test';
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Always use .env.test for testing (both unit tests and E2E tests)
    dotenv.config({path: path.join(__dirname, '..', '..', 'environments', '.env.test')});
}

//connect with MongoDB database
const mongoUri = process.env.MONGO_URI;
console.log('DB config - MONGO_URI found:', mongoUri ? 'Yes' : 'No');
console.log('DB config - Environment:', process.env.NODE_ENV);

const connection = mongoose.connect(mongoUri) //input DB connection string from .env
    .then(() => console.log("Connected to MongoDB!"))
    .catch((err) => console.log("Error connecting to MongoDB: ",err));

export default connection; //export the connection for use in other modules