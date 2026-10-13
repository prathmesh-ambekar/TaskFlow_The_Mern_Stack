// Local MongoDB for development, no install needed: `npm run db`
// Data is kept in backend/.data so it survives restarts.
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const dbPath = path.join(__dirname, '..', '.data');
fs.mkdirSync(dbPath, { recursive: true });

MongoMemoryServer.create({ instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' } })
  .then((server) => {
    console.log(`MongoDB running at ${server.getUri()} (data in ${dbPath})`);
    const stop = () => server.stop({ doCleanup: false }).then(() => process.exit(0));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((err) => {
    console.error('Could not start MongoDB:', err.message);
    process.exit(1);
  });
