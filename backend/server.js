import pino from "pino-http";
import sanitize from "mongo-sanitize";
import express from "express";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import helmet from "helmet";
import database from "./config/database.mjs";
import logger from "./config/logger.mjs";
import Notify from "./models/notify.mjs";
// Fix for __dirname: https://github.com/nodejs/help/issues/2907#issuecomment-757446568
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(pino({ logger: logger, autoLogging: false, quietReqLogger: true }));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
// Serve JavaScript assets at /
app.use("/", express.static(path.join(__dirname, "../frontend")));
app.use(
  // https://github.com/helmetjs/helmet#reference
  helmet({
    // Use defaults for Content Security Policy (CSP) apart from specific directives
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "https://ps2alert.me",
          "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js",
          "https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js",
        ],
        "img-src": [
          "'self'",
          // Allow Bootstrap 5 SVGs: https://github.com/twbs/bootstrap/issues/25394
          "data:",
          "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/",
        ],
        "style-src": [
          "'self'",
          "https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css",
          "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css",
          "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css",
        ],
        "upgrade-insecure-requests": [],
      },
    },
    // Disable and enable certain middlewares
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    expectCt: true,
    referrerPolicy: true,
    hsts: {
      preload: false,
    },
    noSniff: true,
    originAgentCluster: false,
    dnsPrefetchControl: {
      allow: true,
    },
    ieNoOpen: true,
    frameguard: true,
    permittedCrossDomainPolicies: true,
    hidePoweredBy: true,
    xssFilter: true,
  })
);
app.set("views", path.join(__dirname, "../frontend/views"));
app.set("view engine", "pug");

const csrfProtection = csurf({
  // https://github.com/expressjs/csurf#cookie
  cookie: {
    // Sign the cookie using the COOKIE_SECRET when in production
    signed: process.env.NODE_ENV === "production" ? true : false,
    // Set cookie as secure when production
    // Can only be sent over a HTTPS connection
    secure: process.env.NODE_ENV === "production" ? true : false,
    // One day in seconds
    maxAge: 24 * 60 * 60,
    // Make the cookie inaccessible in the client's JavaScript
    httpOnly: true,
    // Declare if cookies should be restricted to a first-party or same-site context
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
    // true when production, otherwise false
    sameSite: process.env.NODE_ENV === "production" ? true : false,
  },
});

/**
 * Sanitise input to mitigate against query selector injection attacks in NoSQL
 * @param {express.Request.body} input The express.Request.body to sanitise.
 * @returns {string} A sanitised copy of express.Request.body.
 */
async function sanitiseBody(input) {
  return await sanitize(input);
}

// PS2Alert.me routes
app.get("/", csrfProtection, async (req, res) => {
  res.render("index", { csrfToken: req.csrfToken() });
});

app.post("/api/post-subscription", csrfProtection, async (req, res) => {
  req.log.info(
    `Subscribing ${req.body.subscription.endpoint} for push notifications.`
  );
  sanitiseBody(req.body).then((cleanBody) => {
    const newNotify = new Notify(cleanBody);
    newNotify
      .save({
        validateBeforeSave: true,
      })
      .then((doc) => {
        req.log.info(
          {
            endpoint: doc.subscription.endpoint,
            servers: doc.servers,
          },
          "Successfully added Notify document to MongoDB."
        );
        res.sendStatus(201);
      })
      .catch((err) => {
        req.log.error(`Failed to save Notify document to MongoDB: ${err}`);
        res.sendStatus(500);
      });
  });
});

app.delete("/api/delete-subscription", csrfProtection, async (req, res) => {
  req.log.info(`Unsubscribing ${req.body.endpoint} from push notifications.`);
  sanitiseBody(req.body.endpoint).then((cleanEndpoint) => {
    Notify.where()
      .findOneAndDelete(
        {
          "subscription.endpoint": { $eq: cleanEndpoint },
        },
        { rawResult: false }
      )
      .then((doc) => {
        req.log.info(
          `Successfully deleted Notify document matching endpoint: ${doc.subscription.endpoint} from MongoDB.`
        );
        res.sendStatus(200);
      })
      .catch((err) => {
        req.log.error(
          `Failed to delete Notify document matching endpoint: ${cleanEndpoint} from MongoDB: ${err}`
        );
        res.sendStatus(500);
      });
  });
});

app.patch("/api/patch-subscription", async (req, res) => {
  req.log.info(JSON.stringify(res.body), "Subscription update received.");
  sanitiseBody(req.body).then((cleanBody) => {
    Notify.where()
      .findOneAndUpdate(
        {
          "subscription.endpoint": { $eq: cleanBody.oldSubscription.endpoint },
        },
        { subscription: cleanBody.newSubscription },
        { new: true, rawResult: false }
      )
      .then((doc) => {
        req.log.info(
          {
            endpoint: doc._doc.subscription.endpoint,
            servers: doc._doc.servers,
          },
          `Successfully updated Notify document matching old endpoint: ${cleanBody.oldSubscription.endpoint}`
        );
        res.sendStatus(200);
      })
      .catch((err) => {
        req.log.error(
          `Failed to update Notify document matching old endpoint: ${cleanBody.oldSubscription.endpoint}: ${err}`
        );
        res.sendStatus(500);
      });
  });
});

// Connect to MongoDB
await database();

app.listen(8080);
