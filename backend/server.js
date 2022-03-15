import pino from 'pino-http';
import sanitize from 'mongo-sanitize';
import express from 'express';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import helmet from 'helmet';
import database from './config/database.mjs';
import logger from './config/logger.mjs';
import Notify from './models/notify.mjs';
// Fix for __dirname: https://github.com/nodejs/help/issues/2907#issuecomment-757446568
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sanitise input to mitigate against query selector injection attacks in NoSQL
 * @param {express.Request.body} input The express.Request.body to sanitise.
 * @returns {string} A sanitised copy of express.Request.body.
 */
async function sanitiseBody(input) {
  return await sanitize(input);
};

// Setup route middleware for CSRF
const csrfProtection = csurf({
  // https://github.com/expressjs/csurf#cookie
  cookie: {
    // Sign the cookie using the COOKIE_SECRET when in production
    signed: process.env.NODE_ENV === 'production' ? true : false,
    // Set cookie as secure when production
    // Can only be sent over a HTTPS connection
    secure: process.env.NODE_ENV === 'production' ? true : false,
    // One day in seconds
    maxAge: 24 * 60 * 60,
    // Make the cookie inaccessible in the client's Javascript
    httpOnly: true,
    // Declare if cookies should be restricted to a first-party or same-site context
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
    // true when production, otherwise false
    sameSite: process.env.NODE_ENV === 'production' ? true : false
  }
})

// Setup Express server
const app = express();
// Configure Pino logger
app.use(pino({ logger: logger, autoLogging: false, quietReqLogger: true }));
// Parse JSON
app.use(express.json());
// Configure cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));
// Use Helmet to set useful security defaults
app.use(
  helmet({
    // https://github.com/helmetjs/helmet#reference
    // Use defaults for Content Security Policy (CSP) apart from specific directives
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://ps2alert.me', 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js', 'https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js'],
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
  req.log.info(`Subscribing ${req.body.subscription.endpoint} for alert push notifications.`);
  // Sanitise req.body to mitigate against query selector injection attacks
  const cleanBody = await sanitiseInput(req.body);
  // Create newNotify document from Notify model
  const newNotify = new Notify(cleanBody);
  // Save document to MongoDB
  await newNotify.save({ validateBeforeSave: true, checkKeys: true }, async function (error, doc, _) {
    if (error) {
      // Log error and return HTTP error status code
      req.log.error(`Failed to save Notify document to MongoDB: ${error}`);
      res.sendStatus(500);
      return;
    }
    req.log.info({
      endpoint: doc.subscription.endpoint,
      servers: doc.servers
    }, 'Successfully added Notify document to MongoDB.');
    // Successfully created resource HTTP status code
    res.sendStatus(201);
  });
});

// /remove-subscription API route
app.delete('/remove-subscription', csrfProtection, async (req, res) => {
  req.log.info(`Unsubscribing ${req.body.endpoint} from alert push notifications.`);
  // Sanitise req.body.endpoint to mitigate against query selector injection attacks
  const cleanEndpoint = await sanitiseInput(req.body.endpoint);
  req.log.info(`Deleting Notify document matching the endpoint: ${cleanEndpoint}`);
  // Remove Notify document containing the matching endpoint
  await Notify.where().findOneAndDelete({
    'subscription.endpoint': { $eq: cleanEndpoint }
  }, { rawResult: false }, async function (error, doc) {
    if (error) {
      // Log error and return HTTP error status code
      req.log.error(`Failed to delete Notify document matching the endpoint: ${cleanEndpoint} from MongoDB: ${error}`);
      res.sendStatus(500);
      return;
    };
    req.log.info(`Successfully deleted Notify document matching the endpoint: ${doc.subscription.endpoint} from MongoDB.`);
    // Successfully deleted resource HTTP status code
    res.sendStatus(200);
  }
  );
});

// /update-subscription API route
app.patch('/update-subscription', async (req, res) => {
  req.log.info(res.body, 'Subscription update received.');
  // Sanitise req.body to mitigate against query selector injection attacks
  const cleanBody = await sanitiseInput(req.body);
  req.log.info(`Updating Notify document matching the old endpoint: ${cleanBody.oldSubscription.endpoint}`);
  // Update Notify document matching the old endpoint
  await Notify.where().findOneAndUpdate({ 'subscription.endpoint': { $eq: cleanBody.oldSubscription.endpoint } },
    { subscription: cleanBody.newSubscription }, { new: true, rawResult: false },
    async function (error, doc) {
      if (error) {
        // Log error and return HTTP error status code
        req.log.error(`Failed to update Notify document matching the old endpoint: ${cleanBody.oldSubscription.endpoint}: ${error}`);
        res.sendStatus(500);
        return;
      };
      req.log.info({
        endpoint: doc._doc.subscription.endpoint,
        servers: doc._doc.servers
      },
        `Successfully updated Notify document matching the old endpoint: ${cleanBody.oldSubscription.endpoint}`);
      // Successfully updated resource HTTP status code
      res.sendStatus(200);
    }
  );
});

// Connect to MongoDB
database();

// Start the Express server
app.listen(8080);
