FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Install RabbitMQ publisher dependencies
RUN npm install amqplib ps2census bufferutil utf-8-validate

# Copy publisher.js to working directory
COPY publisher.js .

CMD ["node", "publisher.js"]
