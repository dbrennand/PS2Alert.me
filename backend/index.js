// Import required libraries
import path from 'path';
import express from 'express';
import helmet from 'helmet';
// Fix for __dirname: https://github.com/nodejs/help/issues/2907#issuecomment-757446568
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Setup Express server
const port = process.env.PORT;
const interface = process.env.INTERFACE;
const app = express();
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Serve all files in frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// /add-subscription API endpoint
app.post('/add-subscription', async (req, res) => {
  console.log(`Subscribing ${req.body.subscription.endpoint} for push notifications.`);
  // Add subscription object to database
  // TODO
  // Successfully created resource HTTP status code
  res.sendStatus(201);
});

// /remove-subscription API endpoint
app.delete('/remove-subscription', async (req, res) => {
  console.log(`Unsubscribing ${req.body.endpoint} from push notifications.`);
  // Remove subscription object from the database
  // TODO
  // Successfully deleted resource HTTP status code
  res.sendStatus(200);
});

// Start the Express server
app.listen(port, () => {
  console.log(`PS2-Alert-Notify listening at http://${interface}:${port}`);
});
