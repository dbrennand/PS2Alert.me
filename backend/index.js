// Import required libraries
import path from 'path';
import express from 'express';
import helmet from 'helmet';
// Fix for __dirname: https://github.com/nodejs/help/issues/2907#issuecomment-757446568
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Import custom functions and model
import database from './config/database';
import Notify from './models/notifyModel';

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
  try {
    // Create newNotify document from Notify model
    const newNotify = new Notify(req.body);
    // Save document to MongoDB
    await newNotify.save();
    // Successfully created resource HTTP status code
    res.sendStatus(201);
  } catch (error) {
    // Log error and return HTTP error status code
    console.error(`An error occurred saving Notify model to MongoDB: ${error}`);
    res.sendStatus(500);
  }
});

// /remove-subscription API endpoint
app.delete('/remove-subscription', async (req, res) => {
  console.log(`Unsubscribing ${req.body.endpoint} from push notifications.`);
  // Remove Notify object containing the matching endpoint
  try {
    await Notify.remove({ endpoint: req.body.endpoint });
    // Successfully deleted resource HTTP status code
    res.sendStatus(200);
  } catch {
    // Log error and return HTTP error status code
    console.error(`An error occurred removing Notify model with endpoint: ${req.body.endpoint} from MongoDB: ${error}`);
    res.sendStatus(500);
  }
});

// Connect to MongoDB
database();

// Start the Express server
app.listen(port, () => {
  console.log(`PS2-Alert-Notify listening at http://${interface}:${port}`);
});
