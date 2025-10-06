import dotenv from 'dotenv'; //for loading environment variables
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set NODE_ENV to 'test' if not already set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
}

// Load environment variables FIRST
dotenv.config({path: path.join(__dirname, 'environments', '.env.test')}); //define path to .env file

// Debug: Check if MONGO_URI is loaded
console.log('MONGO_URI loaded:', process.env.MONGO_URI ? 'Yes' : 'No');

// Now import other modules after environment variables are loaded
import app, { server } from "./src/app.js"; //import the Express application and server from src/app.js
import db from './src/config/db.js'; //import the database connection, automatically starting the connection
import userModel from './src/models/user.model.js'; //import the User model to ensure it's registered
import taskModel from './src/models/task.model.js'; //import the Task model to ensure it's registered
import projectModel from './src/models/project.model.js'; //import the Project model to ensure it's registered



const port = process.env.PORT || 3000; //set the port from environment variable or default to 3000

//start the server and listen on the defined port
server.listen(port, () => {
    console.log("Server is running on port " + port);
});

