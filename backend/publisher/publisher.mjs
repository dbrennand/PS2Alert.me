// Import required libraries
import amqp from 'amqplib';
import census from 'ps2census';
const { CensusClient, Events } = census;
// Custom import
import logger from './config/logger.mjs';

// Get RabbitMQ connection URI
const connectionUri = process.env.RABBIT_CONNECTION_URI;

// Connect to RabbitMQ
logger.info('Connecting to RabbitMQ.');
const connection = await amqp.connect(connectionUri);

// Create a new channel
logger.info('Creating a new channel.');
const channel = await connection.createChannel();

// Get Planetside 2 Census API service ID
// Used by the ps2census client
const serviceID = process.env.SERVICEID;

// Declare ps2census subscription object
const subscriptions = {
    // Connery, Miller, Cobalt, Emerald, SolTech
    worlds: ['1', '10', '13', '17', '40'],
    characters: ['all'],
    eventNames: ['MetagameEvent'],
    logicalAndCharactersWithWorlds: true,
};

// Declare Planetside 2 zones (continents)
// Zone (continent) IDs and names: https://ps2.fisu.pw/api/territory/
// Indar, Hossin, Amerish, Esamir
const zones = ['2', '4', '6', '8']

// Initalise ps2census event stream client
const client = new CensusClient(serviceID, 'ps2', {
    streamManager: {
        subscription: subscriptions
    },
});

// Define client behaviour(s)
client.on('ready', () => { logger.info('Client ready and listening for MetagameEvents.'); }); // Client is ready
client.on('reconnecting', () => { logger.info('Client reconnecting.'); }); // Client is reconnecting
client.on('disconnected', () => { logger.warn('Client disconnected.'); }); // Client got disconnected
client.on('duplicate', (dupe) => { logger.warn(`A duplicate event occurred whilst listening for MetagameEvents: ${dupe}`); }); // Duplicate, when a duplicate event has been received
client.on('error', (error) => { logger.error(`An error occurred whilst listening for MetagameEvents: ${error}`); }); // Error
client.on('warn', (warn) => { logger.warn(`A warning occurred whilst listening for MetagameEvents: ${warn}`); }); // Warning, when receiving a corrupt message
client.on(Events.PS2_META_EVENT, async (metagameEvent) => {
    // Check MetagameEvent is in a started state and the zone is in the zones array
    if (metagameEvent.metagame_event_state_name === 'started' && zones.includes(metagameEvent.zone_id)) {
        // MetagameEvent is in a started state and is for a recognised zone (continent)
        logger.info(metagameEvent.raw, `MetagameEvent with ID: ${metagameEvent.instance_id} meets criteria. Sending to queue.`);
        await sendtoQueue(channel, metagameEvent.raw);
    } else {
        logger.info(metagameEvent.raw, `MetagameEvent with ID: ${metagameEvent.instance_id} doesn't meet the criteria.`);
        return;
    };
});

// Function to send MetagameEvent to the RabbitMQ queue
async function sendtoQueue(channel, metagameEvent) {
    // Declare name of the queue
    var queue = 'MetagameEvent';
    // Create queue
    // Does nothing if the queue already exists
    logger.info(`Creating queue: ${queue} if it does not already exist.`);
    await channel.assertQueue(queue, {
        durable: true
    });
    // Send MetagameEvent to the queue
    try {
        logger.info(metagameEvent, `Sending MetagameEvent with ID: ${metagameEvent.instance_id} to the queue: ${queue}`);
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(metagameEvent)));
        logger.info(metagameEvent, `Successfully sent MetagameEvent with ID: ${metagameEvent.instance_id} to the queue: ${queue}`);
    } catch (error) {
        logger.error(metagameEvent, `Failed to send MetagameEvent with ID: ${metagameEvent.instance_id} to the queue: ${queue}\n${error}`);
    };
};

client.watch();
