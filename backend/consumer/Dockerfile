FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Install RabbitMQ consumer dependencies
RUN npm install amqplib web-push mongoose

# Copy consumer.js, config/database.js and models/notifyModel.js to working directory
COPY consumer/consumer.js .
COPY config/ .
COPY models/ .

CMD ["node", "consumer.js"]
