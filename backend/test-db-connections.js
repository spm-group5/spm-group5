const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

async function testConnection(envFile, testDoc) {
  dotenv.config({ path: envFile, override: true });
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error(`No MONGO_URI found in ${envFile}`);
    return;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(); // Uses the DB from the URI
    const result = await db.collection('connection_test').insertOne(testDoc);
    console.log(`Success: Wrote to ${envFile}:`, result.insertedId);
  } catch (err) {
    console.error(`Error with ${envFile}:`, err);
  } finally {
    await client.close();
  }
}

(async () => {
  // Test DB
  await testConnection(
    path.join(__dirname, 'environments/.env.test'),
    { test: 'This is a test DB write', date: new Date() }
  );
  // Prod DB
  await testConnection(
    path.join(__dirname, 'environments/.env.prod'),
    { prod: 'This is a prod DB write', date: new Date() }
  );
})();