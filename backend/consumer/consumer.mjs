import amqplib from "amqplib";
import webpush from "web-push";
import database from "./config/database.mjs";
import logger from "./config/logger.mjs";
import Notify from "./models/notify.mjs";

/**
 * Get a PlanetSide 2 server (world) name from an ID.
 * @param {string} serverID The server ID.
 * @returns {string} The name of the server.
 */
function getServerName(serverID) {
  // Server IDs and names: https://ps2.fisu.pw/api/territory/
  const serverInfo = {
    1: "Connery",
    10: "Miller",
    13: "Cobalt",
    17: "Emerald",
    40: "SolTech",
  };
  return serverInfo[serverID];
}

/**
 * Get a PlanetSide 2 zone (continent) name from an ID
 * @param {string} zoneID The zone ID.
 * @returns {string} The name of the zone.
 */
function getZoneName(zoneID) {
  // Zone (continent) IDs and names: https://ps2.fisu.pw/api/territory/
  const zoneInfo = {
    2: "Indar",
    4: "Hossin",
    6: "Amerish",
    8: "Esamir",
    14: "Koltyr",
    344: "Oshur",
  };
  return zoneInfo[zoneID];
}

const connectionUri = process.env.RABBITMQ_CONNECTION_URI;
const queue = "MetagameEvent";
const publicVapidKey = process.env.CONSUMER_PUBLIC_VAPIDKEY;
const privateVapidKey = process.env.CONSUMER_PRIVATE_VAPIDKEY;
const contactEmail = process.env.CONSUMER_CONTACT_EMAIL;
webpush.setVapidDetails(contactEmail, publicVapidKey, privateVapidKey);

// Connect to MongoDB
await database();

logger.info("Connecting to RabbitMQ.");
amqplib
  .connect(connectionUri)
  .then((conn) => {
    logger.info("Connection established. Creating channel.");
    return conn.createChannel();
  })
  .then((chan) => {
    logger.info(`Channel established. Asserting queue: ${queue}`);
    return chan.assertQueue(queue, { durable: true });
  })
  .then((_) => {
    logger.info(
      `Waiting for messages (MetagameEvents) from RabbitMQ queue: ${queue}`
    );
    return chan.consume(queue, (msg) => {
      chan.ack(msg);
      var metagameEventJson = JSON.parse(msg.content);
      logger.info(metagameEventJson, "Parsed MetagameEvent.");
      var serverName = getServerName(metagameEventJson.world_id);
      var zoneName = getZoneName(metagameEventJson.zone_id);
      var payload = {
        title: `${serverName}: Alert started!`,
        body: `On continent ${zoneName}.`,
      };
      // Get matching Notify documents from MongoDB
      Notify.find({
        servers: metagameEventJson.world_id,
      })
        .then((notifyDocuments) => {
          logger.info(
            `Found ${notifyDocuments.length} matching Notify document(s).`
          );
          for (let doc = 0; doc < notifyDocuments.length; doc++) {
            // Send push notification
            /*
                https://github.com/web-push-libs/web-push#input
                Set the time to live (TTL) option to 5 minutes (300 seconds)
                TTL describes how long the push notification is retained by the push service
                Users shouldn't receive a push notification for an alert that happened ages in the past
                This will tell the push service to attempt delivery of the push notification for 5 minutes, if it is never delivered, discard it
                The default is 4 weeks!
                */
            logger.info(
              `Sending push notification to endpoint: ${notifyDocuments[doc].subscription.endpoint}`
            );
            webpush
              .sendNotification(
                notifyDocuments[doc].subscription,
                JSON.stringify(payload),
                { TTL: 300 }
              )
              .then((res) => {
                logger.info(
                  JSON.stringify(res),
                  `Push notification sent to endpoint: ${notifyDocuments[doc].subscription.endpoint}`
                );
              })
              .catch((err) => {
                logger.error(
                  JSON.stringify(err),
                  `Failed to send push notification to endpoint: ${notifyDocuments[doc].subscription.endpoint}`
                );
              });
          }
        })
        .catch((err) => {
          logger.error(
            JSON.stringify(err),
            "Failed to find matching Notify document(s)."
          );
        });
    });
  })
  .catch((err) => {
    logger.error(
      JSON.stringify(err),
      `An error occurred whilst consuming messages from RabbitMQ queue: ${queue}`
    );
  });
