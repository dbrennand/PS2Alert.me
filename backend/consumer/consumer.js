// Import required libraries
import amqp from 'amqplib';
import webpush from 'web-push';
// Import custom functions and model
import database from './config/database';
import Notify from './models/notifyModel';

// Connect to MongoDB
database();

// Setup webpush vapid details
const publicVapidKey = process.env.PUBLICVAPIDKEY;
const privateVapidKey = process.env.PRIVATEVAPIDKEY;
const contactEmail = process.env.CONTACTEMAIL;

export default () => {
    webpush.setVapidDetails(
        contactEmail,
        publicVapidKey,
        privateVapidKey,
    );
};

// Get RabbitMQ credentials
const rabbitmqUsername = process.env.DBUSERNAME;
const rabbitmqPassword = process.env.DBPASSWORD;

// Connect to RabbitMQ
amqp.connect(`ampq://${rabbitmqUsername}:${rabbitmqPassword}@rabbitmq:5672`, function (error, connection) {
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
            console.log(`Recieved message: ${message.content}`)
            // Parse MetagameEvent JSON
            var metagameEventJson = JSON.parse(message.content);
            // Get server name from ID
            var serverName = getServerName(metagameEventJson.world_id);
            // Get world (continent) name from ID
            var continentName = getContinentName(metagameEventJson.zone_id);
            // Create push notification object
            var pushNotification = {
                title: `${serverName}: Alert started!`,
                body: `On continent ${continentName}.`
            };
            // Get matching Notify documents from MongoDB
            var matchingNotifyDocuments = getMatchingNotifyDocuments(metagameEventJson.world_id);
            // Iterate over matching documents, sending a push notification using the subscription data
            matchingNotifyDocuments.forEach((notifyDocument) => {
                // Send push notification
                webpush.sendNotification(notifyDocument.subscription, JSON.stringify(pushNotification));
            })
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

function getMatchingNotifyDocuments(serverID) {
    // Create array to populate with matching Notify documents
    var matchingNotifyDocuments = [];
    // Get Notify documents that match the server ID
    // Use cursor as a stream for scalability
    Notify.
        find({ servers: [serverID] }).
        cursor().
        on('data', function (notifyDocument) { matchingNotifyDocuments.push(notifyDocument); }).
        on('end', () => { console.log('Finished finding matching documents.'); return matchingNotifyDocuments; });
};
