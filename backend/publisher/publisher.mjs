// Import required libraries
import amqp from 'amqplib';
import { Client, Events } from "ps2census";

// Get RabbitMQ credentials
const rabbitmqUsername = process.env.RABBITMQUSERNAME;
const rabbitmqPassword = process.env.RABBITMQPASSWORD;
// Get ps2census service ID
const serviceID = process.env.SERVICEID;

// Declare ps2census subscription object
const subscription = {
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
const client = new Client(serviceID, {
    streamManagerConfig: {
        subscription
    },
});

// Define client behaviour
client.on('ready', () => { console.log('Client ready and listening for MetagameEvents.'); }); // Client is ready
client.on('reconnecting', () => { console.log('Reconnecting...'); }); // Client is reconnecting
client.on('disconnected', () => { console.log('Disconnected.'); }); // Client got disconnected
client.on('error', (error) => { console.log(error); }); // Error
client.on('warn', (error) => { console.log(error); }); // Error, when receiving a corrupt message
client.on(Events.PS2_META_EVENT, async (event) => {
    // Check MetagameEvent is in a started state
    if (event.metagame_event_state_name === 'started' && zones.includes(event.zone_id)) {
        // MetagameEvent is in a started state as is for a recognised zone (continent)
        console.log(`MetagameEvent with ID: ${event.instance_id} meets criteria. Sending to queue.`)
        await sendtoQueue(event.raw);
    } else {
        return;
    };
});

// Function to send MetagameEvent to RabbitMQ queue
async function sendtoQueue(metagameEvent) {
    // Connect to RabbitMQ
    try {
        console.log('Connecting to RabbitMQ...');
        var connection = await amqp.connect(`amqp://${rabbitmqUsername}:${rabbitmqPassword}@rabbitmq:5672`);
    } catch (error) {
        // Log error to console and exit
        console.error(`An error occurred connecting to RabbitMQ: ${error}`);
        process.exit(1);
    };
    // Create a new channel
    try {
        console.log('Creating new channel.');
        var channel = await connection.createChannel();
    } catch (error) {
        // Log error to console, close connection and return
        console.error(`An error occurred creating a new channel to RabbitMQ: ${error}`);
        await connection.close();
        return;
    };
    // Declare name of queue
    var queue = 'MetagameEvent';
    // Create queue
    // Does nothing if the queue already exists
    console.log(`Creating queue: ${queue} if it does not already exist.`);
    await channel.assertQueue(queue, {
        durable: true
    });
    // Send MetagameEvent to queue
    try {
        console.log(`Sending MetagameEvent with ID: ${metagameEvent.instance_id} to queue.`);
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(metagameEvent)));
        console.log(`Successfully sent MetagameEvent with ID: ${metagameEvent.instance_id} to queue.`);
    } catch (error) {
        // Log error to console and return
        console.error(`An error occurred sending MetagameEvent with ID: ${metagameEvent.instance_id} to queue. ${error}`);
    } finally {
        // Close connection
        await channel.close();
        await connection.close();
    };
};

client.watch();
