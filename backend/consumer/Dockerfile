FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Install RabbitMQ consumer dependencies
RUN npm install amqplib@0.8.0 web-push@3.4.5 mongoose@5.13.9

# Copy consumer.mjs, config/database.mjs and models/notifyModel.mjs
COPY --chown=node:node consumer/consumer.mjs .
COPY --chown=node:node config/ ./config
COPY --chown=node:node models/ ./models

# Set Node user
USER node

CMD ["node", "consumer.mjs"]
