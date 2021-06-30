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

// Initalise ps2census event stream client
const client = new Client(serviceID, {
    streamManagerConfig: {
        subscription
    },
});

// Define client behaviour
client.on('reconnecting', () => { console.log('Reconnecting...'); }); // Client is reconnecting
client.on('disconnected', () => { console.log('Disconnected.'); }); // Client got disconnected
client.on('error', (error) => { console.log(error); }); // Error
client.on('warn', (error) => { console.log(error); }); // Error, when receiving a corrupt message
client.on(Events.PS2_META_EVENT, async (event) => {
    // Check MetagameEvent is in a started state
    if (!(event.metagame_event_state_name === 'started')) {
        return;
    }
    // MetagameEvent is in a started state
    console.log(`MetagameEvent with ID: ${event.instance_id} is in a started state.`)
    await sendtoQueue(event);
});

// Function to send MetagameEvent to RabbitMQ queue
async function sendtoQueue(metagameEvent) {
    // Connect to RabbitMQ
    console.log('Connecting to RabbitMQ...')
    await amqp.connect(`ampq://${rabbitmqUsername}:${rabbitmqPassword}@rabbitmq:5672`, async function (error, connection) {
        if (error) {
            // Log error to console and exit
            console.error(`An error occurred connecting to RabbitMQ: ${error}`);
            process.exit(1);
        }
        // Create a new channel
        await connection.createChannel(async function (error, channel) {
            if (error) {
                // Log error to console, close connection and return
                console.error(`An error occurred creating a new channel to RabbitMQ: ${error}`);
                await connection.close();
                return;
            }
            // Declare name of queue
            var queue = 'MetagameEvent';
            // Create queue
            // Does nothing if the queue already exists
            await channel.assertQueue(queue, {
                durable: true
            });
            // Send MetagameEvent to queue
            await channel.sendToQueue(queue, Buffer.from(JSON.stringify(metagameEvent)));
            console.log(`Sent MetagameEvent with ID: ${metagameEvent.instance_id} to queue.`);
            await channel.close();
        });
        await connection.close();
    });
};
