import dotenv from 'dotenv'; //for loading environment variables
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('__dirname:', __dirname);

dotenv.config({path: path.join(__dirname, 'environments', '.env.test')});

console.log('NODE_ENV:', process.env.NODE_ENV);

// Debug: Check if MONGO_URI is loaded
console.log('MONGO_URI loaded:', process.env.MONGO_URI ? 'Yes' : 'No');

// Debug: Check if SESSION_SECRET is loaded
console.log('SESSION_SECRET loaded:', process.env.SESSION_SECRET ? 'Yes' : 'No');

// Now import other modules after environment variables are loaded
const { default: app, server } = await import('./src/app.js');
const db = await import('./src/config/db.js');
const userModel = await import('./src/models/user.model.js');
const taskModel = await import('./src/models/task.model.js');
const projectModel = await import('./src/models/project.model.js');


const port = process.env.PORT || 3000; //set the port from environment variable or default to 3000

//start the server and listen on the defined port
server.listen(port, () => {
    console.log("Server is running on port " + port);
});

