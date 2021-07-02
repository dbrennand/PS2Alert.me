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
        // Callback for when RabbitMQ pushes messages to the consumer
        channel.consume(queue, function (message) {
            console.log(`Recieved message: ${message.content}`);
            // Parse MetagameEvent JSON
            var metagameEventJson = JSON.parse(message.content);
            // Get server (world) name and zone (continent) name from IDs
            var serverName = getServerName(metagameEventJson.world_id);
            var continentName = getContinentName(metagameEventJson.zone_id);
            // Create push notification object
            var pushNotification = {
                title: `${serverName}: Alert started!`,
                body: `On continent ${continentName}.`
            };
            console.log(pushNotification);
            // Get matching Notify documents from MongoDB
            Notify.find({ servers: metagameEventJson.world_id }, function (error, notifyDocuments) {
                if (error) {
                    // Log error to console
                    console.error(`An error occurred finding Notify documents from MongoDB: ${error}`);
                    return;
                }
                // For debugging purposes, output matching documents
                console.log(`Matching documents: ${notifyDocuments}`);
                // Successfully found matching documents, iterate over each document using the subscription data to send a push notification
                notifyDocuments.forEach((notifyDocument) => {
                    // Send push notification
                    webpush.sendNotification(notifyDocument.subscription, JSON.stringify(pushNotification));
                });
                console.log(`Push notification sent to ${notifyDocuments.length} subscribers for MetagameEvent with ID: ${metagameEventJson.instance_id}`);
            });
        }, {
            noAck: true
        });
    });
});

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

function getContinentName(zoneID) {
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
