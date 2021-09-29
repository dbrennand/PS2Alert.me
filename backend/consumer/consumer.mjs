// Import required libraries
import amqp from 'amqplib/callback_api.js';
import webpush from 'web-push';
// Custom imports and model
import database from './config/database.mjs';
import logger from './config/logger.mjs';
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

// Get RabbitMQ connection URI
const connectionUri = process.env.RABBIT_CONNECTION_URI;

// Connect to RabbitMQ
logger.info('Connecting to RabbitMQ.');
amqp.connect(connectionUri, function (error, connection) {
    if (error) {
        // Log error and exit
        logger.error(`Failed to connect to RabbitMQ: ${error}`);
        process.exit(1);
    };
    // Create a new channel
    logger.info('Creating a new channel.');
    connection.createChannel(function (error, channel) {
        if (error) {
            logger.error(`Failed to create a new channel to RabbitMQ: ${error}`);
            connection.close();
            process.exit(1);
        };
        // Declare name of queue
        var queue = 'MetagameEvent';

        // Wait for the Queue to exist before consuming messages
        channel.assertQueue(queue, {
            durable: true
        });
        logger.info(`Waiting for messages (MetagameEvents) from RabbitMQ queue: ${queue}.`);
        // Callback function for when RabbitMQ pushes messages to the consumer
        channel.consume(queue, function (message) {
            logger.info(`Message received: ${message.content}`);
            // Acknowledge the message
            channel.ack(message);
            // Parse MetagameEvent JSON
            var metagameEventJson = JSON.parse(message.content);
            logger.info(metagameEventJson, 'Parsed MetagameEvent JSON.');
            // Get server (world) name and zone (continent) name from IDs
            var serverName = getServerName(metagameEventJson.world_id);
            var zoneName = getZoneName(metagameEventJson.zone_id);
            // Create push notification object
            var pushNotification = {
                title: `${serverName}: Alert started!`,
                body: `On continent ${zoneName}.`
            };
            // Output push notification object
            logger.info(pushNotification);
            // Get matching Notify documents from MongoDB
            Notify.find({ servers: metagameEventJson.world_id }, function (error, notifyDocuments) {
                if (error) {
                    logger.error(`Failed to find notify document from MongoDB: ${error}`);
                    return;
                }
                // Output number of matching documents
                logger.info(`Matching documents found: ${notifyDocuments.length}`);
                // Successfully found matching documents, iterate over each document using the subscription data to send a push notification
                for (let doc = 0; doc < notifyDocuments.length; doc++) {
                    // Send push notification
                    /*
                    https://github.com/web-push-libs/web-push#input
                    Set the time to live (TTL) option to 5 minutes (300 seconds)
                    TTL describes how long the push notification is retained by the push service
                    User's shouldn't receive a push notification for an alert that happened ages in the past
                    This will tell the push service to attempt delivery of the push notification for 5 minutes, if it is never delivered, discard it
                    The default is 4 weeks!
                    */
                    logger.info(`Sending push notification to endpoint: ${notifyDocuments[doc].subscription.endpoint}`);
                    webpush.sendNotification(notifyDocuments[doc].subscription, JSON.stringify(pushNotification), { TTL: 300 })
                        .catch(pushError => logger.error(pushError.body, `Failed to send push notification - ${pushError.statusCode}`));
                }
                logger.info(`Push notification sent to ${notifyDocuments.length} subscribers for MetagameEvent with ID: ${metagameEventJson.instance_id}`);
            });
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
