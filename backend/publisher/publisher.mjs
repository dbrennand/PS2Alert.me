import amqplib from "amqplib";
import census from "ps2census";
import logger from "./config/logger.mjs";

const queue = "MetagameEvent";
const connectionUri = process.env.RABBITMQ_CONNECTION_URI;
logger.info("Connecting to RabbitMQ.");
const conn = await amqplib.connect(connectionUri);
logger.info("Connection established. Creating channel.");
const chan = await conn.createChannel();
await chan.assertQueue(queue, { durable: true });

/**
 * Publish a MetagameEvent to the RabbitMQ queue.
 * @param {amqplib.Channel} chan The RabbitMQ channel.
 * @param {ps2census.Events.PS2_META_EVENT.raw} metaGameEvent The JSON representation of a PS2_META_EVENT.
 */
async function publishToQueue(chan, metaGameEvent) {
  logger.info(
    metaGameEvent,
    `Publishing MetagameEvent with ID: ${metaGameEvent.instance_id} to the queue: ${queue}`
  );
  chan.sendToQueue(queue, Buffer.from(JSON.stringify(metaGameEvent)));
}

const { CensusClient, Events } = census;
const serviceID = process.env.PUBLISHER_SERVICEID;
// Zone (continent) IDs and names: https://ps2.fisu.pw/api/territory/
// Indar, Hossin, Amerish, Esamir, Koltyr, Oshur
const zones = ["2", "4", "6", "8", "14", "344"];
const subscriptions = {
  // Connery, Miller, Cobalt, Emerald, SolTech
  worlds: ["1", "10", "13", "17", "40"],
  characters: ["all"],
  eventNames: ["MetagameEvent"],
  logicalAndCharactersWithWorlds: true,
};
const client = new CensusClient(serviceID, "ps2", {
  streamManager: {
    subscription: subscriptions,
  },
});

client.on("ready", () => {
  logger.info("Client ready and listening for MetagameEvents.");
});
client.on("reconnecting", () => {
  logger.info("Client reconnecting.");
});
client.on("disconnected", () => {
  logger.warn("Client disconnected.");
});
client.on("duplicate", (dupe) => {
  logger.warn(
    JSON.stringify(dupe),
    "A duplicate event occurred whilst listening for MetagameEvents."
  );
});
client.on("error", (err) => {
  logger.error(
    JSON.stringify(err),
    "An error occurred whilst listening for MetagameEvents."
  );
});
client.on("warn", (warn) => {
  logger.warn(
    JSON.stringify(warn),
    "A warning occurred whilst listening for MetagameEvents."
  );
});
client.on(Events.PS2_META_EVENT, async (metaGameEvent) => {
  if (
    metaGameEvent.metagame_event_state_name === "started" &&
    zones.includes(metaGameEvent.zone_id)
  ) {
    logger.info(
      metaGameEvent.raw,
      `MetagameEvent with ID: ${metaGameEvent.instance_id} meets criteria. Publishing to queue: ${queue}`
    );
    publishToQueue(chan, metaGameEvent.raw)
      .then(() => {
        logger.info(
          metaGameEvent.raw,
          `Successfully published MetagameEvent with ID: ${metaGameEvent.instance_id} to the queue: ${queue}`
        );
      })
      .catch((err) => {
        logger.error(
          `Failed to publish MetagameEvent with ID: ${metaGameEvent.instance_id} to the queue: ${queue}: ${err}`
        );
      });
  } else {
    logger.info(
      metaGameEvent.raw,
      `MetagameEvent with ID: ${metaGameEvent.instance_id} does not meet the criteria.`
    );
  }
});

/**
 * Configure 5 minute interval to rerun subscriptions to the websocket API
 * to ensure our connection doesn't go stale causing loss of events.
 */
setInterval(
  async (client) => {
    client
      .resubscribe()
      .then(() => {
        logger.info("Rerun subscriptions.");
      })
      .catch((err) => {
        logger.error(`Failed to rerun subscriptions: ${err}`);
      });
  },
  300000,
  client
);

client.watch();
