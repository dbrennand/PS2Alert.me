// Import required libraries
import amqp from 'amqplib/callback_api.js';
import webpush from 'web-push';
// Import custom functions and model
import database from './config/database.mjs';
import Notify from './models/notifyModel.mjs';

// Connect to MongoDB
database();

// Setup webpush vapid details
const publicVapidKey = process.env.PUBLICVAPIDKEY;
const privateVapidKey = process.env.PRIVATEVAPIDKEY;
const contactEmail = process.env.CONTACTEMAIL;
webpush.setVapidDetails(
    contactEmail,
    publicVapidKey,
    privateVapidKey,
);

// Get RabbitMQ credentials
const rabbitmqUsername = process.env.RABBITMQUSERNAME;
const rabbitmqPassword = process.env.RABBITMQPASSWORD;

// Connect to RabbitMQ
console.log('Connecting to RabbitMQ...');
amqp.connect(`amqp://${rabbitmqUsername}:${rabbitmqPassword}@rabbitmq:5672`, function (error, connection) {
    if (error) {
        // Log error to console and exit
        console.error(`An error occurred connecting to RabbitMQ: ${error}`);
        process.exit(1);
    };
    // Create a new channel
    console.log('Creating a new channel.');
    connection.createChannel(function (error, channel) {
        if (error) {
            // Log error to console, close connection and exit
            console.error(`An error occurred creating a new channel to RabbitMQ: ${error}`);
            connection.close();
            process.exit(1);
        };
        // Declare name of queue
        var queue = 'MetagameEvent';

        // Wait for the Queue to exist before consuming messages
        channel.assertQueue(queue, {
            durable: true
        });
        console.log(`Waiting for messages (MetagameEvents) from queue: ${queue}. To exit press CTRL+C`);
        // Callback function for when RabbitMQ pushes messages to the consumer
        channel.consume(queue, function (message) {
            console.log(`Received message: ${message.content}`);
            // Parse MetagameEvent JSON
            var metagameEventJson = JSON.parse(message.content);
            // Get server (world) name and zone (continent) name from IDs
            var serverName = getServerName(metagameEventJson.world_id);
            var zoneName = getZoneName(metagameEventJson.zone_id);
            // Create push notification object
            var pushNotification = {
                title: `${serverName}: Alert started!`,
                body: `On continent ${zoneName}.`
            };
            // Output push notification object
            console.log(pushNotification);
            // Get matching Notify documents from MongoDB
            Notify.find({ servers: metagameEventJson.world_id }, function (error, notifyDocuments) {
                if (error) {
                    // Log error to console
                    console.error(`An error occurred finding Notify documents from MongoDB: ${error}`);
                    return;
                }
                // Output number matching documents
                console.log(`Matching documents found: ${notifyDocuments.length}`);
                // Successfully found matching documents, iterate over each document using the subscription data to send a push notification
                for (let doc = 0; doc < notifyDocuments.length; doc++) {
                    // Send push notification
                    try {
                        webpush.sendNotification(notifyDocuments[doc].subscription, JSON.stringify(pushNotification));
                    } catch (error) {
                        console.error(`An error occurred sending push notification to endpoint: ${notifyDocuments[doc].subscription.endpoint}: ${error}`);
                    }
                }
                console.log(`Push notification sent to ${notifyDocuments.length} subscribers for MetagameEvent with ID: ${metagameEventJson.instance_id}`);
            });
        }, {
            noAck: true
        });
    });
});

// Function to get a Planetside 2 server (world) name from an ID
function getServerName(serverID) {
    // Server IDs and names: https://ps2.fisu.pw/api/territory/
    // Declare object containing server IDs and names
    const serverInfo = {
        '1': 'Connery',
        '10': 'Miller',
        '13': 'Cobalt',
        '17': 'Emerald',
        '40': 'SolTech',
    };
    return serverInfo[serverID];
};

// Function to get a Planetside 2 zone (continent) name from an ID
function getZoneName(zoneID) {
    // Zone (continent) IDs and names: https://ps2.fisu.pw/api/territory/
    // Declare object containing zone (continent) IDs and names
    const zoneInfo = {
        '2': 'Indar',
        '4': 'Hossin',
        '6': 'Amerish',
        '8': 'Esamir',
    };
    return zoneInfo[zoneID];
};
