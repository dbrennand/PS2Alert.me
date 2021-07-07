// Import required libraries
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import sanitize from 'mongo-sanitize';
// Fix for __dirname: https://github.com/nodejs/help/issues/2907#issuecomment-757446568
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Import custom functions and model
import database from './config/database.mjs';
import Notify from './models/notifyModel.mjs';

// Setup Express server
const port = 8080;
const app = express();
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Serve all files in frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Function to sanitise input to mitigate against query selector injection attacks in NoSQL
async function sanitiseInput(input) {
  var cleanInput = sanitize(input);
  return cleanInput;
}

// /add-subscription API endpoint
app.post('/add-subscription', async (req, res) => {
  console.log(`Subscribing ${req.body.subscription.endpoint} for push notifications.`);
  try {
    // Sanitise req.body
    const cleanBody = await sanitiseInput(req.body);
    // Create newNotify document from Notify model
    const newNotify = new Notify(cleanBody);
    // Save document to MongoDB
    await newNotify.save({ validateBeforeSave: true, checkKeys: true }, async function (error, doc, _) {
      if (error) {
        // Log error and return HTTP error status code
        console.error(`An error occurred saving Notify model to MongoDB: ${error}`);
        res.sendStatus(500);
        return;
      }
      console.log(`Successfully added Notify document to MongoDB: ${doc}`)
      // Successfully created resource HTTP status code
      res.sendStatus(201);
    });
  } catch (error) {
    // Log error and return HTTP error status code
    console.error(`An error occurred during the creation and saving of a Notify model to MongoDB: ${error}`);
    res.sendStatus(500);
  }
});

// /remove-subscription API endpoint
app.delete('/remove-subscription', async (req, res) => {
  console.log(`Unsubscribing ${req.body.endpoint} from push notifications.`);
  // Sanitise req.body.endpoint to mitigate against query selector injection attacks
  const cleanEndpoint = await sanitiseInput(req.body.endpoint);
  // Remove Notify object containing the matching endpoint
  await Notify.where().findOneAndDelete({
    "subscription.endpoint": { $eq: cleanEndpoint }
  }, { rawResult: false }, async function (error, doc) {
    if (error) {
      // Log error and return HTTP error status code
      console.error(`An error occurred removing Notify document with endpoint: ${cleanEndpoint} from MongoDB: ${error}`);
      res.sendStatus(500);
      return;
    };
    console.log(`Successfully removed Notify document with endpoint: ${cleanEndpoint} from MongoDB: ${doc}`)
    // Successfully deleted resource HTTP status code
    res.sendStatus(200);
  }
  );
});

// Connect to MongoDB
database();

// Start the Express server
app.listen(port, () => {
  console.log(`PS2Alert.me listening on port: ${port}`);
});
