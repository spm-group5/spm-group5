import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkTasksAndNotify } from '../services/email-notification.services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../environments/.env.test') });

// Import your MongoDB connection
import '../config/db.js'; // or whatever file initializes mongoose.connect()

(async () => {
  try {
    console.log('Checking tasks and sending notifications...');
    await checkTasksAndNotify();
    console.log('✅ Notification check completed.');
  } catch (error) {
    console.error('❌ Error running notification check:', error);
  } finally {
    await mongoose.disconnect();
  }
})();
