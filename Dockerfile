FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy and install ps2-alert-notify dependencies
COPY package*.json ./
RUN npm install

# Copy ps2-alert-notify source code
COPY backend/ ./backend
COPY frontend/ ./frontend

EXPOSE 8080

CMD ["node", "backend/index.js"]
