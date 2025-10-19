import { test, expect } from 'vitest';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testConnection(envFile, testDoc) {
  dotenv.config({ path: envFile, override: true });
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error(`No MONGO_URI found in ${envFile}`);
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const result = await db.collection('connection_test').insertOne(testDoc);
    return result.insertedId;
  } finally {
    await client.close();
  }
}

// Increase timeout to accommodate slower connections
test('Test DB connection', async () => {
  // Skip this test if no MONGO_URI (in-memory DB mode)
  const envFile = path.join(__dirname, '/environments/.env.test');
  dotenv.config({ path: envFile, override: true });
  const uri = process.env.MONGO_URI;
  
  if (!uri) {
    console.log('⏭️  Skipping DB connection test (using in-memory database in CI)');
    return; // Skip the test
  }
  
  // Only run this test if MONGO_URI exists (local environment)
  const id = await testConnection(
    envFile, 
    { test: 'This is a test DB write', date: new Date() }  // ✅ Pass an object, not a string!
  );
  expect(id).toBeDefined();
  expect(id).toBeTruthy();
});

// test('Prod DB connection', async () => {
//   const id = await testConnection(
//     path.join(__dirname, '../../environments/.env.prod'),
//     { prod: 'This is a prod DB write', date: new Date() }
//   );
//   expect(id).toBeDefined();
// });