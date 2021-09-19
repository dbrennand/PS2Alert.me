// Import required libraries
import amqp from 'amqplib';
import census from 'ps2census';
const { CensusClient, Events } = census;

// Get RabbitMQ connection URI
const connectionUri = process.env.RABBIT_CONNECTION_URI;

// Connect to RabbitMQ
console.log('Connecting to RabbitMQ...');
const connection = await amqp.connect(connectionUri);

// Create a new channel
console.log('Creating a new channel.');
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
client.on('ready', () => { console.log('Client ready and listening for MetagameEvents.'); }); // Client is ready
client.on('reconnecting', () => { console.log('Client reconnecting...'); }); // Client is reconnecting
client.on('disconnected', () => { console.log('Client disconnected.'); }); // Client got disconnected
client.on('duplicate', (dupe) => { console.log(`A duplicate event occurred whilst listening for MetagameEvents: ${dupe}`); }); // Duplicate, when a duplicate event has been received
client.on('error', (error) => { console.log(`An error occurred whilst listening for MetagameEvents: ${error}`); }); // Error
client.on('warn', (warn) => { console.log(`A warning occurred whilst listening for MetagameEvents: ${warn}`); }); // Warning, when receiving a corrupt message
client.on(Events.PS2_META_EVENT, async (event) => {
    // Check MetagameEvent is in a started state and the zone is in the zones array
    if (event.metagame_event_state_name === 'started' && zones.includes(event.zone_id)) {
        // MetagameEvent is in a started state and is for a recognised zone (continent)
        console.log(`MetagameEvent with ID: ${event.instance_id} meets criteria. Sending to queue.`)
        await sendtoQueue(channel, event.raw);
    } else {
        console.log(`MetagameEvent with ID: ${event.instance_id} doesn't meet the criteria.`)
        return;
    };
});

// Function to send MetagameEvent to the RabbitMQ queue
async function sendtoQueue(channel, metagameEvent) {
    // Declare name of the queue
    var queue = 'MetagameEvent';
    // Create queue
    // Does nothing if the queue already exists
    console.log(`Creating queue: ${queue} if it does not already exist.`);
    await channel.assertQueue(queue, {
        durable: true
    });
    // Send MetagameEvent to queue
    try {
        console.log(`Sending MetagameEvent with ID: ${metagameEvent.instance_id} to the queue.`);
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(metagameEvent)));
        console.log(`Successfully sent MetagameEvent with ID: ${metagameEvent.instance_id} to the queue.`);
    } catch (error) {
        // Log error to console
        console.error(`An error occurred sending MetagameEvent with ID: ${metagameEvent.instance_id} to the queue: ${error}`);
    };
};

// Configure 5 minute interval to rerun all subscriptions to the websocket API
// This is to ensure our connection doesn't go stale causing loss of events
setInterval(async function (client) {
    console.log('Rerun all subscriptions.');
    await client.resubscribe();
}, 120000, client);

client.watch();
