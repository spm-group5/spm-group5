import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;
let isConnected = false;

// Setup function that runs before all tests
beforeAll(async () => {
  // Only create connection if not already connected
  if (!isConnected) {
    // Start an in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to the in-memory database
    await mongoose.connect(mongoUri);
    isConnected = true;
  }
}, 30000); // 30 second timeout for setup

// Cleanup function that runs after all tests
afterAll(async () => {
  // Close the database connection
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }

  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000); // 30 second timeout for cleanup

// Utility function to clear database manually if needed
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Utility function to get test database connection
export const getTestDatabase = () => mongoServer;

// Export connection state for other test files
export { mongoServer, isConnected };
