import mongoose from 'mongoose'; //for MongoDB connection
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables if not already loaded
if (!process.env.MONGO_URI) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    dotenv.config({path: path.join(__dirname, '..', '..', 'environments', '.env.test')});
}

//connect with MongoDB database
const mongoUri = process.env.MONGO_URI;
console.log('DB config - MONGO_URI found:', mongoUri ? 'Yes' : 'No');

const connection = mongoose.connect(mongoUri) //input DB connection string from .env
    .then(() => console.log("Connected to MongoDB!"))
    .catch((err) => console.log("Error connecting to MongoDB: ",err));

export default connection; //export the connection for use in other modules