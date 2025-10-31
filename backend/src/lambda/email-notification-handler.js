// This is the Lambda entry point
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import mongoose from 'mongoose';
import { checkTasksAndNotify } from '../services/email-notification.services.js';

const ssmClient = new SSMClient({ region: 'ap-southeast-1' });

// Lambda handler function
export async function handler(event, context) {
  try {
    // 1. Get MongoDB URI from SSM
    const mongoUri = await getParameter('/spm-g4t5/prod/mongo-uri');
    
    // 2. Get SMTP credentials from SSM
    process.env.SMTP_HOST = await getParameter('/spm-g4t5/prod/smtp/host');
    process.env.SMTP_PORT = await getParameter('/spm-g4t5/prod/smtp/port');
    process.env.SMTP_LOGIN = await getParameter('/spm-g4t5/prod/smtp/user');
    process.env.SMTP_KEY = await getParameter('/spm-g4t5/prod/smtp/password');
    process.env.MONGO_URI = mongoUri;
    
    // 3. Connect to MongoDB
    await mongoose.connect(mongoUri);
    
    // 4. Call your existing function (unchanged!)
    await checkTasksAndNotify();
    
    // 5. Disconnect
    await mongoose.disconnect();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notifications sent successfully' })
    };
  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || error.toString() || 'Unknown error occurred',
        errorType: error.name || 'UnknownError',
        stack: error.stack
      })
    };
}
}

// Helper to get SSM parameters
async function getParameter(name) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true
  });
  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}
