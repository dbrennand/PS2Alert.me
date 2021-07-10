# 🚨 PS2Alert.me

Browser notifications for Planetside 2 alerts.

![PS2Alert.me](images/PS2AlertMe.png)

<p align="center">
  <img src="images/notification.png"/>
</p>

## Project Dependencies

* [Express.js](https://expressjs.com/)

* [Helmet](https://www.npmjs.com/package/helmet)

* [cookie-parser](https://github.com/expressjs/cookie-parser)

* [csurf](https://github.com/expressjs/csurf)

* [mongo-sanitize](https://github.com/vkarpov15/mongo-sanitize)

* [web-push](https://www.npmjs.com/package/web-push)

* [Mongoose](https://mongoosejs.com/)

* [amqplib](https://github.com/squaremo/amqp.node)

* [ps2census](https://github.com/microwavekonijn/ps2census)

## Introduction

PS2Alert.me allows a user to receive push notifications for Planetside 2 alerts in their browser. The application achieves this by leveraging [Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers), the [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) and [Push Services](https://developers.google.com/web/ilt/pwa/introduction-to-push-notifications#push_notification_terms).

### Components

The project has several components:

1. Web application (frontend - PS2Alert.me):

    - Users select the Planetside 2 server(s) to subscribe to alert notifications for and a Service Worker is registered to receive push notifications.

2. MongoDB (Backend):

    - A user's chosen server(s) to subscribe to alert notifications for and subscription data (forming the [Notify model](backend/models/notifyModel.mjs)) are stored in the database.

    - The web application and consumer interact with the database. Adding and removing Notify documents and retrieving them respectively.

3. RabbitMQ (Backend):

    - A messaging broker where *MetagameEvents* (alerts) are sent from the publisher (mentioned below) to a queue which is then consumed (by the consumer component).

4. Publisher (Backend):

    - Connects to the Planetside 2 WebSocket Event Stream and listens for *MetagameEvents*. When a *MetagameEvent* matching the [criteria](https://github.com/dbrennand/PS2Alert.me/blob/master/backend/publisher/publisher.mjs#L40) occurs, the publisher sends the *MetagameEvent* to the queue.

5. Consumer (Backend):

    - Watches the RabbitMQ queue for *MetagameEvents*. When a *MetagameEvent* occurs in the queue, find all Notify documents that are subscribed to push notifications for the server which the *MetagameEvent* is occurring on and send a push notification to each.

## Development and Deployment

The project stack can be deployed locally using [Docker](https://www.docker.com/).

## Deployment Prerequisites

1. A Daybreak Games Census API Service ID.

    - You can sign up for one [here](https://census.daybreakgames.com/#devSignup).

2. Node.js installed on your machine to perform step 3.

3. Install [web-push](https://www.npmjs.com/package/web-push) to generate VAPID public and private keys using the command: `npx web-push generate-vapid-keys`

4. Modify the [.env](.env) file providing all environment variables.

5. Modify [frontend/index.js](frontend/index.js#L2) `const publicVapidKey = "";` with your generated VAPID public key.

## Deployment

Use the following steps to deploy the PS2Alert.me stack locally using Docker:

1. Clone the repository: `git clone https://github.com/dbrennand/PS2Alert.me.git && cd PS2Alert.me`

2. Bring up the project stack: `docker-compose -f docker-compose-dev.yaml up -d --build`

The frontend will then be available at: http://localhost:8080

## Authors -- Contributors

* [**dbrennand**](https://github.com/dbrennand) - *Author*

## License
This project is licensed under the GNU GENERAL PUBLIC LICENSE Version 3 - see the [LICENSE](LICENSE) for details.
