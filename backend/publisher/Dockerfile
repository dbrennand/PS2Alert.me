FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Install RabbitMQ publisher dependencies
RUN npm install amqplib@0.8.0 ps2census@3.1.1 bufferutil@4.0.3 utf-8-validate@5.0.5 winston@3.3.3

# Copy publisher.js to working directory
COPY --chown=node:node publisher.mjs .

# Set Node user
USER node

CMD ["node", "publisher.mjs"]
