// Import required libraries
const express = require('express');
const path = require('path');
const lowdb = require('lowdb');

// Setup database using lowdb
// Creates db.json at backend/db.json
const dbFile = path.join(__dirname, 'db.json');
const adapter = new lowdb.JSONFile(dbFile);
const db = new lowdb.Low(adapter);

// Read data from database JSON file, this will set db.data content
await db.read();
// If database did not exist previously, db.data will be null
// So, populate with default data if this is the case
db.data ||= { subscriptions: [] }

// Setup Express server
const app = express();
const port = 3000

// Serve all files in frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

// /add-subscription API endpoint
app.post('/add-subscription', function (req, res) {
  console.log(`Subscribing ${req.body.endpoint} for push notifications.`);
  // Add subscription object to database
  db.data.subscriptions.push(req.body);
  await db.write();
  // Successfully created resource HTTP status code
  res.status(201);
});

// /remove-subscription API endpoint
app.delete('/remove-subscription', function (req, res) {
  console.log(`Unsubscribing ${req.body.endpoint} from push notifications.`);
  // Remove subscription object from the database
  db.data.subscriptions.remove({ endpoint: req.body.endpoint });
  await db.write();
  // Successfully deleted resource HTTP status code
  res.status(204);
});

// Start the Express server
app.listen(port, () => {
  console.log(`PS2-Alert-Notify listening at http://localhost:${port}`);
});
