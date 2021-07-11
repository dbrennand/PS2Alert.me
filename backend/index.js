// Import required libraries
import sanitize from 'mongo-sanitize';
import express from 'express';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
// Fix for __dirname: https://github.com/nodejs/help/issues/2907#issuecomment-757446568
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Import custom functions and model
import database from './config/database.mjs';
import Notify from './models/notifyModel.mjs';

// Function to sanitise input to mitigate against query selector injection attacks in NoSQL
async function sanitiseInput(input) {
  var cleanInput = sanitize(input);
  return cleanInput;
};

// Setup route middleware for CSRF
const csrfProtection = csurf({
  cookie: true
})

// Setup Express server
const port = 8080;
const app = express();
// Parse JSON
app.use(express.json());
// Configure cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET, {
  // https://www.npmjs.com/package/cookie#options-1
  // One day in seconds
  maxAge: 24 * 60 * 60,
  // Make the cookie inaccessible in the client's Javascript
  httpOnly: true,
  // Declare if cookies should be restricted to a first-party or same-site context
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
  // true when production, otherwise false
  sameSite: process.env.NODE_ENV === 'production' ? true : false,
  // Set cookie as secure when production
  // Can only be sent over a HTTPS connection
  secure: process.env.NODE_ENV === 'production' ? true : false
}));
// Use Helmet to set useful security defaults
app.use(
  helmet({
    // https://github.com/helmetjs/helmet#reference
    // Use defaults for Content Security Policy (CSP) apart from specific directives
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://ps2alert.me', 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js'],
        'img-src': ["'self'", 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/'],
        'style-src': ["'self'", 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css', 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.5.0/font/bootstrap-icons.css'],
        'upgrade-insecure-requests': []
      },
    },
    // Disable and enable certain middlewares
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    expectCt: true,
    referrerPolicy: true,
    hsts: {
      preload: false
    },
    noSniff: true,
    originAgentCluster: false,
    dnsPrefetchControl: {
      allow: true
    },
    ieNoOpen: true,
    frameguard: true,
    permittedCrossDomainPolicies: true,
    hidePoweredBy: true,
    xssFilter: true
  })
);

// Set views directory
app.set('views', path.join(__dirname, '../frontend/views'));
// Set template engine as pug
app.set('view engine', 'pug');
// Serve Javascript assets at /
app.use('/', express.static(path.join(__dirname, '../frontend')));

// PS2Alert.me / route
app.get('/', csrfProtection, async (req, res) => {
  // Provide the CSRF token to the index view
  res.render('index', { csrfToken: req.csrfToken() });
});

// /add-subscription API route
app.post('/add-subscription', csrfProtection, async (req, res) => {
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
        console.error(`An error occurred saving Notify document to MongoDB: ${error}`);
        res.sendStatus(409);
        return;
      }
      console.log(`Successfully added Notify document to MongoDB: ${doc}`)
      // Successfully created resource HTTP status code
      res.sendStatus(201);
    });
  } catch (error) {
    // Log error and return HTTP error status code
    console.error(`An error occurred during the creation and saving of a Notify document to MongoDB: ${error}`);
    res.sendStatus(500);
  }
});

// /remove-subscription API route
app.delete('/remove-subscription', csrfProtection, async (req, res) => {
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
