FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Install RabbitMQ consumer dependencies
RUN npm install amqplib web-push mongoose

# Copy consumer.mjs, config/database.mjs and models/notifyModel.mjs to working directory
COPY consumer/consumer.mjs .
COPY config/ ./config
COPY models/ ./models

CMD ["node", "consumer.mjs"]
