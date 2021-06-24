// Import required libraries
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { Low, JSONFile } from 'lowdb'
import webpush from './webpush';
// Fix for __dirname: https://github.com/nodejs/help/issues/2907#issuecomment-757446568
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Setup database using lowdb
// Creates db.json at backend/db.json
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Read data from database JSON file, this will set db.data content
await db.read();
// If database did not exist previously, db.data will be null
// So, populate with default data if this is the case
db.data ||= { subscriptions: [] }

// Setup Express server
const app = express();
const port = process.env.PORT;
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
// Webpush set vapid details
webpush();

// Serve all files in frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// /add-subscription API endpoint
app.post('/add-subscription', async (req, res) => {
  console.log(`Subscribing ${req.body.endpoint} for push notifications.`);
  // Add subscription object to database
  db.data.subscriptions.push(req.body);
  await db.write();
  // Successfully created resource HTTP status code
  res.sendStatus(201);
});

// /remove-subscription API endpoint
app.delete('/remove-subscription', async (req, res) => {
  console.log(`Unsubscribing ${req.body.endpoint} from push notifications.`);
  // Remove subscription object from the database
  db.data.subscriptions = db.data.subscriptions.filter(endpoint => endpoint === req.body.endpoint);
  await db.write();
  // Successfully deleted resource HTTP status code
  res.sendStatus(200);
});

// Start the Express server
app.listen(port, () => {
  console.log(`PS2-Alert-Notify listening at http://localhost:${port}`);
});
