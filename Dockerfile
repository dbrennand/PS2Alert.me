FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy and install PS2Alert.me dependencies
COPY --chown=node:node package*.json ./
RUN npm install

# Copy PS2Alert.me source code
COPY --chown=node:node backend/ ./backend
COPY --chown=node:node frontend/ ./frontend

# Expose port 8080
EXPOSE 8080

# Set Node user
USER node

CMD ["node", "backend/index.js"]
